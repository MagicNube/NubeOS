//! Frontera Tauri del primer vertical de Documentos.

use std::{sync::Mutex, time::SystemTime};

use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::meals::commands::ProductDatabase;

use super::{
    document::{CivilDate, Document, DocumentCategory, DocumentId, DocumentStatus},
    expiry::{expiry_status, Clock, ExpiryStatus, MadridClock},
    import::{import_document as run_import_document, ImportDocumentInput},
    lifecycle::{delete_document as run_delete_document, replace_pdf as run_replace_pdf},
    repository::{DocumentQuery, DocumentRepository, DocumentSort, ExpiryFilter},
    store::{PdfStore, PendingPdfToken},
    system::{FileClipboard, SystemFileClipboard},
    tag::Tag,
};

pub struct DocumentStoreState {
    pub store: Mutex<PdfStore>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DocumentCategoryDto {
    Identity,
    Work,
    Education,
    Finance,
    Health,
    Housing,
    Vehicles,
    Resume,
    Other,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DocumentStatusDto {
    Active,
    Archived,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ExpiryStatusDto {
    NoExpiry,
    Expired,
    ExpiringSoon,
    Valid,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocumentSortDto {
    ImportedNewest,
    ImportedOldest,
    Name,
    ExpirySoonest,
    ExpiryLatest,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExpiryFilterDto {
    Expired,
    NextThirtyDays,
    ThisYear,
    NoExpiry,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDocumentsDto {
    pub status: Option<DocumentStatusDto>,
    pub search: Option<String>,
    pub category: Option<DocumentCategoryDto>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub favorites_only: bool,
    pub expiry: Option<ExpiryFilterDto>,
    pub sort: Option<DocumentSortDto>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocumentDto {
    pub name: String,
    pub category: DocumentCategoryDto,
    pub document_date: Option<String>,
    pub expires_on: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpirySummaryDto {
    pub expired: usize,
    pub expiring_soon: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDocumentDto {
    pub name: String,
    pub category: DocumentCategoryDto,
    pub document_date: Option<String>,
    pub expires_on: Option<String>,
    pub tags: Vec<String>,
    pub pending_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingPdfDto {
    pub token: String,
    pub original_file_name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDto {
    pub id: String,
    pub name: String,
    pub category: DocumentCategoryDto,
    pub document_date: Option<String>,
    pub expires_on: Option<String>,
    pub expiry_status: ExpiryStatusDto,
    pub favorite: bool,
    pub status: DocumentStatusDto,
    pub original_file_name: String,
    pub file_size_bytes: u64,
    pub imported_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandErrorDto {
    pub code: &'static str,
    pub message: String,
}

#[tauri::command]
pub async fn select_document_pdf(
    app: AppHandle,
    state: State<'_, DocumentStoreState>,
) -> Result<Option<PendingPdfDto>, CommandErrorDto> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Documento PDF", &["pdf"])
        .blocking_pick_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|_| {
        command_error(
            "invalidSelection",
            "La selección no corresponde a un archivo local.",
        )
    })?;
    let mut store = state.store.lock().map_err(|_| unavailable())?;
    let pending = store
        .prepare(&path)
        .map_err(|error| command_error("invalidPdf", error.to_string()))?;
    Ok(Some(PendingPdfDto {
        token: pending.token().to_string(),
        original_file_name: pending.original_name().as_str().to_owned(),
        size_bytes: pending.size_bytes(),
    }))
}

#[tauri::command]
pub fn discard_pending_document_pdf(
    state: State<'_, DocumentStoreState>,
    token: String,
) -> Result<(), CommandErrorDto> {
    let token = PendingPdfToken::parse(&token)
        .map_err(|error| command_error("invalidSelection", error.to_string()))?;
    state
        .store
        .lock()
        .map_err(|_| unavailable())?
        .discard(token)
        .map_err(|error| command_error("invalidSelection", error.to_string()))
}

#[tauri::command]
pub fn import_document(
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    input: ImportDocumentDto,
) -> Result<DocumentDto, CommandErrorDto> {
    let input = ImportDocumentInput {
        name: input.name,
        category: category_from_dto(input.category),
        document_date: input.document_date.as_deref().map(parse_date).transpose()?,
        expires_on: input.expires_on.as_deref().map(parse_date).transpose()?,
        tags: input.tags,
        pending_token: PendingPdfToken::parse(&input.pending_token)
            .map_err(|error| command_error("invalidSelection", error.to_string()))?,
    };
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut store = store_state.store.lock().map_err(|_| unavailable())?;
    run_import_document(&mut connection, &mut store, input)
        .map(|document| document_to_dto(&document))
        .map_err(|error| command_error("importFailed", error.to_string()))
}

#[tauri::command]
pub fn list_documents(
    database: State<'_, ProductDatabase>,
    input: ListDocumentsDto,
) -> Result<Vec<DocumentDto>, CommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    DocumentRepository::new(&mut connection)
        .query(&DocumentQuery {
            status: input
                .status
                .map(status_from_dto)
                .unwrap_or(DocumentStatus::Active),
            search: input.search,
            category: input.category.map(category_from_dto),
            tags: input.tags,
            favorites_only: input.favorites_only,
            expiry: input.expiry.map(expiry_filter_from_dto),
            sort: input
                .sort
                .map(sort_from_dto)
                .unwrap_or(DocumentSort::ImportedNewest),
            today: MadridClock.today(),
        })
        .map(|documents| documents.iter().map(document_to_dto).collect())
        .map_err(|error| command_error("internal", error.to_string()))
}

#[tauri::command]
pub fn list_document_tags(
    database: State<'_, ProductDatabase>,
    search: Option<String>,
) -> Result<Vec<String>, CommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    DocumentRepository::new(&mut connection)
        .list_tags(search.as_deref())
        .map_err(repository_error)
}

#[tauri::command]
pub fn get_document_expiry_summary(
    database: State<'_, ProductDatabase>,
) -> Result<ExpirySummaryDto, CommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let documents = DocumentRepository::new(&mut connection)
        .list(DocumentStatus::Active)
        .map_err(repository_error)?;
    let today = MadridClock.today();
    Ok(ExpirySummaryDto {
        expired: documents
            .iter()
            .filter(|document| expiry_status(document.expires_on(), today) == ExpiryStatus::Expired)
            .count(),
        expiring_soon: documents
            .iter()
            .filter(|document| {
                expiry_status(document.expires_on(), today) == ExpiryStatus::ExpiringSoon
            })
            .count(),
    })
}

#[tauri::command]
pub fn update_document(
    database: State<'_, ProductDatabase>,
    document_id: String,
    input: UpdateDocumentDto,
) -> Result<DocumentDto, CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = DocumentRepository::new(&mut connection);
    let mut document = repository
        .find_by_id(id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let tags = input
        .tags
        .into_iter()
        .map(Tag::new)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| command_error("validation", error.to_string()))?;
    document.update_metadata(
        super::document::DocumentName::new(input.name)
            .map_err(|error| command_error("validation", error.to_string()))?,
        category_from_dto(input.category),
        input.document_date.as_deref().map(parse_date).transpose()?,
        input.expires_on.as_deref().map(parse_date).transpose()?,
        tags,
        SystemTime::now(),
    );
    repository
        .save_metadata(&document)
        .map_err(repository_error)?;
    Ok(document_to_dto(&document))
}

#[tauri::command]
pub fn set_document_favorite(
    database: State<'_, ProductDatabase>,
    document_id: String,
    favorite: bool,
) -> Result<(), CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    DocumentRepository::new(&mut connection)
        .set_favorite(id, favorite, SystemTime::now())
        .map_err(repository_error)
}

#[tauri::command]
pub fn archive_document(
    database: State<'_, ProductDatabase>,
    document_id: String,
) -> Result<(), CommandErrorDto> {
    set_status(&database, &document_id, DocumentStatus::Archived)
}

#[tauri::command]
pub fn restore_document(
    database: State<'_, ProductDatabase>,
    document_id: String,
) -> Result<(), CommandErrorDto> {
    set_status(&database, &document_id, DocumentStatus::Active)
}

#[tauri::command]
pub fn delete_document(
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
) -> Result<(), CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let store = store_state.store.lock().map_err(|_| unavailable())?;
    run_delete_document(&mut connection, &store, id)
        .map_err(|error| command_error("deleteFailed", error.to_string()))
}

#[tauri::command]
pub fn replace_document_pdf(
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
    pending_token: String,
) -> Result<DocumentDto, CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let token = PendingPdfToken::parse(&pending_token)
        .map_err(|error| command_error("invalidSelection", error.to_string()))?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut store = store_state.store.lock().map_err(|_| unavailable())?;
    run_replace_pdf(&mut connection, &mut store, id, token)
        .map_err(|error| command_error("replaceFailed", error.to_string()))?;
    DocumentRepository::new(&mut connection)
        .find_by_id(id)
        .map_err(repository_error)?
        .map(|document| document_to_dto(&document))
        .ok_or_else(not_found)
}

#[tauri::command]
pub fn read_document_pdf(
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
) -> Result<tauri::ipc::Response, CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let store = store_state.store.lock().map_err(|_| unavailable())?;
    read_document_pdf_response(&mut connection, &store, id)
}

fn read_document_pdf_response(
    connection: &mut rusqlite::Connection,
    store: &PdfStore,
    id: DocumentId,
) -> Result<tauri::ipc::Response, CommandErrorDto> {
    if DocumentRepository::new(connection)
        .find_by_id(id)
        .map_err(repository_error)?
        .is_none()
    {
        return Err(not_found());
    }
    let bytes = store
        .read(id)
        .map_err(|error| command_error("fileMissing", error.to_string()))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn open_document_pdf(
    app: AppHandle,
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
) -> Result<(), CommandErrorDto> {
    let path = resolve_managed_path(&database, &store_state, &document_id)?;
    app.opener()
        .open_path(path.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|error| command_error("openFailed", format!("No se pudo abrir el PDF: {error}")))
}

#[tauri::command]
pub fn save_document_copy(
    app: AppHandle,
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
) -> Result<bool, CommandErrorDto> {
    let id = parse_document_id(&document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let document = DocumentRepository::new(&mut connection)
        .find_by_id(id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let store = store_state.store.lock().map_err(|_| unavailable())?;
    let source = store
        .managed_path(id)
        .map_err(|error| command_error("fileMissing", error.to_string()))?;
    let destination = app
        .dialog()
        .file()
        .set_file_name(document.pdf().original_file_name().as_str())
        .add_filter("Documento PDF", &["pdf"])
        .blocking_save_file();
    let Some(destination) = destination else {
        return Ok(false);
    };
    let destination = destination
        .into_path()
        .map_err(|_| command_error("saveFailed", "El destino no corresponde a una ruta local."))?;
    std::fs::copy(source, destination).map_err(|error| {
        command_error(
            "saveFailed",
            format!("No se pudo guardar la copia: {error}"),
        )
    })?;
    Ok(true)
}

#[tauri::command]
pub fn copy_document_pdf(
    database: State<'_, ProductDatabase>,
    store_state: State<'_, DocumentStoreState>,
    document_id: String,
) -> Result<(), CommandErrorDto> {
    let path = resolve_managed_path(&database, &store_state, &document_id)?;
    SystemFileClipboard
        .copy_file(&path)
        .map_err(|error| command_error("clipboardUnavailable", error.to_string()))
}

#[tauri::command]
pub fn get_document(
    database: State<'_, ProductDatabase>,
    document_id: String,
) -> Result<DocumentDto, CommandErrorDto> {
    let id = DocumentId::parse(&document_id)
        .map_err(|error| command_error("notFound", error.to_string()))?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    DocumentRepository::new(&mut connection)
        .find_by_id(id)
        .map_err(|error| command_error("internal", error.to_string()))?
        .map(|document| document_to_dto(&document))
        .ok_or_else(|| command_error("notFound", "No existe el documento solicitado."))
}

fn set_status(
    database: &ProductDatabase,
    document_id: &str,
    status: DocumentStatus,
) -> Result<(), CommandErrorDto> {
    let id = parse_document_id(document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    DocumentRepository::new(&mut connection)
        .set_status(id, status, SystemTime::now())
        .map_err(repository_error)
}

fn resolve_managed_path(
    database: &ProductDatabase,
    store_state: &DocumentStoreState,
    document_id: &str,
) -> Result<std::path::PathBuf, CommandErrorDto> {
    let id = parse_document_id(document_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    if DocumentRepository::new(&mut connection)
        .find_by_id(id)
        .map_err(repository_error)?
        .is_none()
    {
        return Err(not_found());
    }
    store_state
        .store
        .lock()
        .map_err(|_| unavailable())?
        .managed_path(id)
        .map_err(|error| command_error("fileMissing", error.to_string()))
}

fn parse_document_id(value: &str) -> Result<DocumentId, CommandErrorDto> {
    DocumentId::parse(value).map_err(|error| command_error("notFound", error.to_string()))
}

fn not_found() -> CommandErrorDto {
    command_error("notFound", "No existe el documento solicitado.")
}
fn repository_error(error: super::repository::DocumentRepositoryError) -> CommandErrorDto {
    match error {
        super::repository::DocumentRepositoryError::NotFound => not_found(),
        super::repository::DocumentRepositoryError::MustBeArchived => {
            command_error("mustBeArchived", error.to_string())
        }
        _ => command_error("internal", error.to_string()),
    }
}

fn document_to_dto(document: &Document) -> DocumentDto {
    let today = MadridClock.today();
    DocumentDto {
        id: document.id().to_string(),
        name: document.name().to_owned(),
        category: category_to_dto(document.category()),
        document_date: document.document_date().map(format_date),
        expires_on: document.expires_on().map(format_date),
        expiry_status: expiry_to_dto(expiry_status(document.expires_on(), today)),
        favorite: document.is_favorite(),
        status: status_to_dto(document.status()),
        original_file_name: document.pdf().original_file_name().as_str().to_owned(),
        file_size_bytes: document.pdf().size_bytes(),
        imported_at: format_instant(document.imported_at()),
        updated_at: format_instant(document.updated_at()),
        tags: document
            .tags()
            .iter()
            .map(|tag| tag.label().to_owned())
            .collect(),
    }
}

fn parse_date(value: &str) -> Result<CivilDate, CommandErrorDto> {
    let parts = value.split('-').collect::<Vec<_>>();
    if parts.len() != 3 {
        return Err(command_error(
            "validation",
            "La fecha no tiene un formato válido.",
        ));
    }
    let parse = |value: &str| {
        value
            .parse::<u16>()
            .map_err(|_| command_error("validation", "La fecha no tiene un formato válido."))
    };
    let year = parse(parts[0])?;
    let month = u8::try_from(parse(parts[1])?)
        .map_err(|_| command_error("validation", "La fecha no es válida."))?;
    let day = u8::try_from(parse(parts[2])?)
        .map_err(|_| command_error("validation", "La fecha no es válida."))?;
    CivilDate::new(year, month, day).map_err(|error| command_error("validation", error.to_string()))
}
fn format_date(value: CivilDate) -> String {
    format!(
        "{:04}-{:02}-{:02}",
        value.year(),
        value.month(),
        value.day()
    )
}
fn format_instant(value: std::time::SystemTime) -> String {
    let value: DateTime<Utc> = value.into();
    value.to_rfc3339_opts(SecondsFormat::Millis, true)
}
fn category_from_dto(value: DocumentCategoryDto) -> DocumentCategory {
    match value {
        DocumentCategoryDto::Identity => DocumentCategory::Identity,
        DocumentCategoryDto::Work => DocumentCategory::Work,
        DocumentCategoryDto::Education => DocumentCategory::Education,
        DocumentCategoryDto::Finance => DocumentCategory::Finance,
        DocumentCategoryDto::Health => DocumentCategory::Health,
        DocumentCategoryDto::Housing => DocumentCategory::Housing,
        DocumentCategoryDto::Vehicles => DocumentCategory::Vehicles,
        DocumentCategoryDto::Resume => DocumentCategory::Resume,
        DocumentCategoryDto::Other => DocumentCategory::Other,
    }
}
fn category_to_dto(value: DocumentCategory) -> DocumentCategoryDto {
    match value {
        DocumentCategory::Identity => DocumentCategoryDto::Identity,
        DocumentCategory::Work => DocumentCategoryDto::Work,
        DocumentCategory::Education => DocumentCategoryDto::Education,
        DocumentCategory::Finance => DocumentCategoryDto::Finance,
        DocumentCategory::Health => DocumentCategoryDto::Health,
        DocumentCategory::Housing => DocumentCategoryDto::Housing,
        DocumentCategory::Vehicles => DocumentCategoryDto::Vehicles,
        DocumentCategory::Resume => DocumentCategoryDto::Resume,
        DocumentCategory::Other => DocumentCategoryDto::Other,
    }
}
fn status_to_dto(value: DocumentStatus) -> DocumentStatusDto {
    match value {
        DocumentStatus::Active => DocumentStatusDto::Active,
        DocumentStatus::Archived => DocumentStatusDto::Archived,
    }
}
fn status_from_dto(value: DocumentStatusDto) -> DocumentStatus {
    match value {
        DocumentStatusDto::Active => DocumentStatus::Active,
        DocumentStatusDto::Archived => DocumentStatus::Archived,
    }
}
fn sort_from_dto(value: DocumentSortDto) -> DocumentSort {
    match value {
        DocumentSortDto::ImportedNewest => DocumentSort::ImportedNewest,
        DocumentSortDto::ImportedOldest => DocumentSort::ImportedOldest,
        DocumentSortDto::Name => DocumentSort::Name,
        DocumentSortDto::ExpirySoonest => DocumentSort::ExpirySoonest,
        DocumentSortDto::ExpiryLatest => DocumentSort::ExpiryLatest,
    }
}
fn expiry_filter_from_dto(value: ExpiryFilterDto) -> ExpiryFilter {
    match value {
        ExpiryFilterDto::Expired => ExpiryFilter::Expired,
        ExpiryFilterDto::NextThirtyDays => ExpiryFilter::NextThirtyDays,
        ExpiryFilterDto::ThisYear => ExpiryFilter::ThisYear,
        ExpiryFilterDto::NoExpiry => ExpiryFilter::NoExpiry,
    }
}
fn expiry_to_dto(value: ExpiryStatus) -> ExpiryStatusDto {
    match value {
        ExpiryStatus::NoExpiry => ExpiryStatusDto::NoExpiry,
        ExpiryStatus::Expired => ExpiryStatusDto::Expired,
        ExpiryStatus::ExpiringSoon => ExpiryStatusDto::ExpiringSoon,
        ExpiryStatus::Valid => ExpiryStatusDto::Valid,
    }
}
fn command_error(code: &'static str, message: impl Into<String>) -> CommandErrorDto {
    CommandErrorDto {
        code,
        message: message.into(),
    }
}
fn unavailable() -> CommandErrorDto {
    command_error("internal", "No se ha podido acceder a Documentos.")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::repository::apply_migrations;
    use std::{fs, path::PathBuf};
    use tauri::ipc::{InvokeResponseBody, IpcResponse};
    use uuid::Uuid;

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!("nubeos-command-{}", Uuid::new_v4()))
    }

    #[test]
    fn date_contract_accepts_iso_and_rejects_invalid_values() {
        assert_eq!(
            parse_date("2026-08-12").unwrap(),
            CivilDate::new(2026, 8, 12).unwrap()
        );
        assert!(parse_date("12/08/2026").is_err());
        assert!(parse_date("2026-02-30").is_err());
    }

    #[test]
    fn pdf_response_contains_exact_raw_bytes_and_distinguishes_missing_states() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let source = root.join("document.pdf");
        let expected = b"%PDF-1.7\nNubeOS binary test";
        fs::write(&source, expected).unwrap();

        let mut store = PdfStore::open(root.join("private")).unwrap();
        let pending = store.prepare(&source).unwrap();
        let mut connection = rusqlite::Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let document = run_import_document(
            &mut connection,
            &mut store,
            ImportDocumentInput {
                name: "Documento binario".into(),
                category: DocumentCategory::Other,
                document_date: None,
                expires_on: None,
                tags: vec![],
                pending_token: pending.token(),
            },
        )
        .unwrap();

        let response = read_document_pdf_response(&mut connection, &store, document.id()).unwrap();
        match response.body().unwrap() {
            InvokeResponseBody::Raw(bytes) => assert_eq!(bytes, expected),
            InvokeResponseBody::Json(_) => panic!("el PDF no debe serializarse como JSON"),
        }

        let Err(absent) = read_document_pdf_response(&mut connection, &store, DocumentId::new())
        else {
            panic!("un documento ausente no debe devolver bytes");
        };
        assert_eq!(absent.code, "notFound");

        fs::remove_file(store.final_path(document.id())).unwrap();
        let Err(missing_file) = read_document_pdf_response(&mut connection, &store, document.id())
        else {
            panic!("un archivo ausente no debe devolver bytes");
        };
        assert_eq!(missing_file.code, "fileMissing");

        fs::remove_dir_all(root).unwrap();
    }
}
