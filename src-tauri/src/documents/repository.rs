//! Persistencia SQLite de metadatos del módulo Documentos.

use std::{fmt, time::SystemTime};

use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::{
    document::{
        CivilDate, Document, DocumentCategory, DocumentError, DocumentId, DocumentName,
        DocumentStatus, ManagedPdf, OriginalPdfName,
    },
    expiry::{expiry_status, ExpiryStatus},
    tag::{Tag, TagError, TagId},
};

#[derive(Debug)]
pub enum DocumentRepositoryError {
    Database(rusqlite::Error),
    InvalidDocument(DocumentError),
    InvalidTag(TagError),
    InvalidStoredValue(&'static str),
    NotFound,
    MustBeArchived,
}

impl fmt::Display for DocumentRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::InvalidDocument(error) => {
                write!(formatter, "Documento guardado inválido: {error}")
            }
            Self::InvalidTag(error) => write!(formatter, "Etiqueta guardada inválida: {error}"),
            Self::InvalidStoredValue(field) => {
                write!(formatter, "Valor guardado inválido: {field}")
            }
            Self::NotFound => write!(formatter, "No existe el documento solicitado."),
            Self::MustBeArchived => write!(formatter, "El documento debe estar archivado."),
        }
    }
}

impl std::error::Error for DocumentRepositoryError {}
impl From<rusqlite::Error> for DocumentRepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Database(value)
    }
}
impl From<DocumentError> for DocumentRepositoryError {
    fn from(value: DocumentError) -> Self {
        Self::InvalidDocument(value)
    }
}
impl From<TagError> for DocumentRepositoryError {
    fn from(value: TagError) -> Self {
        Self::InvalidTag(value)
    }
}

pub struct DocumentRepository<'connection> {
    connection: &'connection mut Connection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DocumentSort {
    ImportedNewest,
    ImportedOldest,
    Name,
    ExpirySoonest,
    ExpiryLatest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpiryFilter {
    Expired,
    NextThirtyDays,
    ThisYear,
    NoExpiry,
}

pub struct DocumentQuery {
    pub status: DocumentStatus,
    pub search: Option<String>,
    pub category: Option<DocumentCategory>,
    pub tags: Vec<String>,
    pub favorites_only: bool,
    pub expiry: Option<ExpiryFilter>,
    pub sort: DocumentSort,
    pub today: CivilDate,
}

impl<'connection> DocumentRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn create(&mut self, document: &Document) -> Result<(), DocumentRepositoryError> {
        let transaction = self.connection.transaction()?;
        Self::insert_in_transaction(&transaction, document)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn insert_in_transaction(
        transaction: &Transaction<'_>,
        document: &Document,
    ) -> Result<(), DocumentRepositoryError> {
        transaction.execute(
            "INSERT INTO documents (
                id, name, normalized_name, category, document_date, expires_on,
                is_favorite, status, original_file_name, normalized_original_file_name,
                stored_file_name, file_size_bytes, imported_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                document.id().to_string(),
                document.name(),
                normalize_search(document.name()),
                category_to_str(document.category()),
                document.document_date().map(format_date),
                document.expires_on().map(format_date),
                i64::from(document.is_favorite()),
                status_to_str(document.status()),
                document.pdf().original_file_name().as_str(),
                normalize_search(document.pdf().original_file_name().as_str()),
                document.id().stored_file_name(),
                i64::try_from(document.pdf().size_bytes())
                    .map_err(|_| DocumentRepositoryError::InvalidStoredValue("file_size_bytes"))?,
                format_instant(document.imported_at()),
                format_instant(document.updated_at()),
            ],
        )?;
        Self::replace_tags(transaction, document)?;
        Ok(())
    }

    fn replace_tags(
        transaction: &Transaction<'_>,
        document: &Document,
    ) -> Result<(), DocumentRepositoryError> {
        for (position, tag) in document.tags().iter().enumerate() {
            transaction.execute(
                "INSERT INTO document_tags (id, label, normalized_label)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(normalized_label) DO NOTHING",
                params![tag.id().to_string(), tag.label(), tag.normalized_label()],
            )?;
            let stored_id: String = transaction.query_row(
                "SELECT id FROM document_tags WHERE normalized_label = ?1",
                [tag.normalized_label()],
                |row| row.get(0),
            )?;
            transaction.execute(
                "INSERT INTO document_tag_links (document_id, tag_id, position)
                 VALUES (?1, ?2, ?3)",
                params![document.id().to_string(), stored_id, position as i64],
            )?;
        }
        Ok(())
    }

    pub fn find_by_id(
        &mut self,
        id: DocumentId,
    ) -> Result<Option<Document>, DocumentRepositoryError> {
        let stored = self
            .connection
            .query_row(
                "SELECT id, name, category, document_date, expires_on, is_favorite, status,
                        original_file_name, stored_file_name, file_size_bytes, imported_at, updated_at
                 FROM documents WHERE id = ?1",
                [id.to_string()],
                StoredDocument::from_row,
            )
            .optional()?;
        stored.map(|value| self.hydrate(value)).transpose()
    }

    pub fn list(
        &mut self,
        status: DocumentStatus,
    ) -> Result<Vec<Document>, DocumentRepositoryError> {
        let stored = {
            let mut statement = self.connection.prepare(
                "SELECT id, name, category, document_date, expires_on, is_favorite, status,
                        original_file_name, stored_file_name, file_size_bytes, imported_at, updated_at
                 FROM documents WHERE status = ?1 ORDER BY imported_at DESC, id",
            )?;
            let documents = statement
                .query_map([status_to_str(status)], StoredDocument::from_row)?
                .collect::<Result<Vec<_>, _>>()?;
            documents
        };
        stored
            .into_iter()
            .map(|value| self.hydrate(value))
            .collect()
    }

    pub fn stored_file_names(&self) -> Result<Vec<String>, DocumentRepositoryError> {
        let mut statement = self
            .connection
            .prepare("SELECT stored_file_name FROM documents")?;
        let names = statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(names)
    }

    pub fn query(
        &mut self,
        query: &DocumentQuery,
    ) -> Result<Vec<Document>, DocumentRepositoryError> {
        let mut documents = self.list(query.status)?;
        let search = query
            .search
            .as_deref()
            .map(normalize_search)
            .filter(|value| !value.is_empty());
        let tags = query
            .tags
            .iter()
            .map(|value| normalize_search(value))
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>();
        documents.retain(|document| {
            let matches_search = search.as_ref().map_or(true, |search| {
                normalize_search(document.name()).contains(search)
                    || normalize_search(document.pdf().original_file_name().as_str())
                        .contains(search)
                    || document
                        .tags()
                        .iter()
                        .any(|tag| tag.normalized_label().contains(search))
            });
            let matches_category = query
                .category
                .map_or(true, |category| document.category() == category);
            let matches_tags = tags.iter().all(|selected| {
                document
                    .tags()
                    .iter()
                    .any(|tag| tag.normalized_label() == selected)
            });
            let matches_favorite = !query.favorites_only || document.is_favorite();
            let status = expiry_status(document.expires_on(), query.today);
            let matches_expiry = query.expiry.map_or(true, |filter| match filter {
                ExpiryFilter::Expired => status == ExpiryStatus::Expired,
                ExpiryFilter::NextThirtyDays => status == ExpiryStatus::ExpiringSoon,
                ExpiryFilter::ThisYear => document
                    .expires_on()
                    .is_some_and(|date| date.year() == query.today.year()),
                ExpiryFilter::NoExpiry => status == ExpiryStatus::NoExpiry,
            });
            matches_search && matches_category && matches_tags && matches_favorite && matches_expiry
        });
        documents.sort_by(|left, right| match query.sort {
            DocumentSort::ImportedNewest => right.imported_at().cmp(&left.imported_at()),
            DocumentSort::ImportedOldest => left.imported_at().cmp(&right.imported_at()),
            DocumentSort::Name => {
                normalize_search(left.name()).cmp(&normalize_search(right.name()))
            }
            DocumentSort::ExpirySoonest => {
                compare_expiry(left.expires_on(), right.expires_on(), false)
            }
            DocumentSort::ExpiryLatest => {
                compare_expiry(left.expires_on(), right.expires_on(), true)
            }
        });
        Ok(documents)
    }

    pub fn save_metadata(&mut self, document: &Document) -> Result<(), DocumentRepositoryError> {
        let transaction = self.connection.transaction()?;
        let affected = transaction.execute(
            "UPDATE documents SET name=?2, normalized_name=?3, category=?4, document_date=?5,
             expires_on=?6, updated_at=?7 WHERE id=?1",
            params![
                document.id().to_string(),
                document.name(),
                normalize_search(document.name()),
                category_to_str(document.category()),
                document.document_date().map(format_date),
                document.expires_on().map(format_date),
                format_instant(document.updated_at())
            ],
        )?;
        if affected == 0 {
            return Err(DocumentRepositoryError::NotFound);
        }
        transaction.execute(
            "DELETE FROM document_tag_links WHERE document_id=?1",
            [document.id().to_string()],
        )?;
        Self::replace_tags(&transaction, document)?;
        transaction.execute(
            "DELETE FROM document_tags WHERE id NOT IN (SELECT tag_id FROM document_tag_links)",
            [],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn set_favorite(
        &mut self,
        id: DocumentId,
        favorite: bool,
        updated_at: SystemTime,
    ) -> Result<(), DocumentRepositoryError> {
        let affected = self.connection.execute(
            "UPDATE documents SET is_favorite=?2, updated_at=?3 WHERE id=?1",
            params![
                id.to_string(),
                i64::from(favorite),
                format_instant(updated_at)
            ],
        )?;
        if affected == 0 {
            return Err(DocumentRepositoryError::NotFound);
        }
        Ok(())
    }

    pub fn set_status(
        &mut self,
        id: DocumentId,
        status: DocumentStatus,
        updated_at: SystemTime,
    ) -> Result<(), DocumentRepositoryError> {
        let affected = self.connection.execute(
            "UPDATE documents SET status=?2, updated_at=?3 WHERE id=?1",
            params![
                id.to_string(),
                status_to_str(status),
                format_instant(updated_at)
            ],
        )?;
        if affected == 0 {
            return Err(DocumentRepositoryError::NotFound);
        }
        Ok(())
    }

    pub fn list_tags(&self, search: Option<&str>) -> Result<Vec<String>, DocumentRepositoryError> {
        let normalized = search.map(normalize_search).unwrap_or_default();
        let pattern = format!("%{normalized}%");
        let mut statement = self.connection.prepare(
            "SELECT label FROM document_tags WHERE normalized_label LIKE ?1 ORDER BY normalized_label LIMIT 30")?;
        let tags = statement
            .query_map([pattern], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tags)
    }

    pub fn delete_in_transaction(
        transaction: &Transaction<'_>,
        id: DocumentId,
    ) -> Result<(), DocumentRepositoryError> {
        let status: Option<String> = transaction
            .query_row(
                "SELECT status FROM documents WHERE id=?1",
                [id.to_string()],
                |row| row.get(0),
            )
            .optional()?;
        match status.as_deref() {
            None => return Err(DocumentRepositoryError::NotFound),
            Some("archived") => {}
            Some(_) => return Err(DocumentRepositoryError::MustBeArchived),
        }
        transaction.execute("DELETE FROM documents WHERE id=?1", [id.to_string()])?;
        transaction.execute(
            "DELETE FROM document_tags WHERE id NOT IN (SELECT tag_id FROM document_tag_links)",
            [],
        )?;
        Ok(())
    }

    pub fn update_pdf_in_transaction(
        transaction: &Transaction<'_>,
        id: DocumentId,
        original_name: &str,
        size_bytes: u64,
        updated_at: SystemTime,
    ) -> Result<(), DocumentRepositoryError> {
        let size = i64::try_from(size_bytes)
            .map_err(|_| DocumentRepositoryError::InvalidStoredValue("file_size_bytes"))?;
        let affected = transaction.execute(
            "UPDATE documents SET original_file_name=?2, normalized_original_file_name=?3,
             file_size_bytes=?4, updated_at=?5 WHERE id=?1",
            params![
                id.to_string(),
                original_name,
                normalize_search(original_name),
                size,
                format_instant(updated_at)
            ],
        )?;
        if affected == 0 {
            return Err(DocumentRepositoryError::NotFound);
        }
        Ok(())
    }

    fn hydrate(&self, stored: StoredDocument) -> Result<Document, DocumentRepositoryError> {
        let id = DocumentId::parse(&stored.id)?;
        if stored.stored_file_name != id.stored_file_name() {
            return Err(DocumentRepositoryError::InvalidStoredValue(
                "stored_file_name",
            ));
        }
        let tags = self.load_tags(&stored.id)?;
        Ok(Document::rehydrate(
            id,
            DocumentName::new(stored.name)?,
            category_from_str(&stored.category)?,
            ManagedPdf::new(
                OriginalPdfName::new(stored.original_file_name)?,
                u64::try_from(stored.file_size_bytes)
                    .map_err(|_| DocumentRepositoryError::InvalidStoredValue("file_size_bytes"))?,
            )?,
            stored
                .document_date
                .as_deref()
                .map(parse_date)
                .transpose()?,
            stored.expires_on.as_deref().map(parse_date).transpose()?,
            stored.is_favorite,
            status_from_str(&stored.status)?,
            parse_instant(&stored.imported_at)?,
            parse_instant(&stored.updated_at)?,
            tags,
        ))
    }

    fn load_tags(&self, document_id: &str) -> Result<Vec<Tag>, DocumentRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT t.id, t.label FROM document_tags t
             JOIN document_tag_links l ON l.tag_id = t.id
             WHERE l.document_id = ?1 ORDER BY l.position",
        )?;
        let rows = statement.query_map([document_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        rows.map(|row| {
            let (id, label) = row?;
            Ok(Tag::with_id(TagId::parse(&id)?, label)?)
        })
        .collect()
    }
}

fn compare_expiry(
    left: Option<CivilDate>,
    right: Option<CivilDate>,
    descending: bool,
) -> std::cmp::Ordering {
    match (left, right) {
        (Some(left), Some(right)) => {
            if descending {
                right.cmp(&left)
            } else {
                left.cmp(&right)
            }
        }
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    }
}

struct StoredDocument {
    id: String,
    name: String,
    category: String,
    document_date: Option<String>,
    expires_on: Option<String>,
    is_favorite: bool,
    status: String,
    original_file_name: String,
    stored_file_name: String,
    file_size_bytes: i64,
    imported_at: String,
    updated_at: String,
}

impl StoredDocument {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            document_date: row.get(3)?,
            expires_on: row.get(4)?,
            is_favorite: row.get(5)?,
            status: row.get(6)?,
            original_file_name: row.get(7)?,
            stored_file_name: row.get(8)?,
            file_size_bytes: row.get(9)?,
            imported_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    }
}

pub fn normalize_search(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn format_date(value: CivilDate) -> String {
    format!(
        "{:04}-{:02}-{:02}",
        value.year(),
        value.month(),
        value.day()
    )
}
fn parse_date(value: &str) -> Result<CivilDate, DocumentRepositoryError> {
    let mut parts = value.split('-');
    let year = parts.next().and_then(|part| part.parse().ok());
    let month = parts.next().and_then(|part| part.parse().ok());
    let day = parts.next().and_then(|part| part.parse().ok());
    if parts.next().is_some() {
        return Err(DocumentRepositoryError::InvalidStoredValue("date"));
    }
    CivilDate::new(
        year.ok_or(DocumentRepositoryError::InvalidStoredValue("date"))?,
        month.ok_or(DocumentRepositoryError::InvalidStoredValue("date"))?,
        day.ok_or(DocumentRepositoryError::InvalidStoredValue("date"))?,
    )
    .map_err(Into::into)
}
fn format_instant(value: SystemTime) -> String {
    let value: DateTime<Utc> = value.into();
    value.to_rfc3339_opts(SecondsFormat::Millis, true)
}
fn parse_instant(value: &str) -> Result<SystemTime, DocumentRepositoryError> {
    DateTime::parse_from_rfc3339(value)
        .map(|value| SystemTime::from(value.with_timezone(&Utc)))
        .map_err(|_| DocumentRepositoryError::InvalidStoredValue("instant"))
}

fn category_to_str(value: DocumentCategory) -> &'static str {
    match value {
        DocumentCategory::Identity => "identity",
        DocumentCategory::Work => "work",
        DocumentCategory::Education => "education",
        DocumentCategory::Finance => "finance",
        DocumentCategory::Health => "health",
        DocumentCategory::Housing => "housing",
        DocumentCategory::Vehicles => "vehicles",
        DocumentCategory::Resume => "resume",
        DocumentCategory::Other => "other",
    }
}
fn category_from_str(value: &str) -> Result<DocumentCategory, DocumentRepositoryError> {
    match value {
        "identity" => Ok(DocumentCategory::Identity),
        "work" => Ok(DocumentCategory::Work),
        "education" => Ok(DocumentCategory::Education),
        "finance" => Ok(DocumentCategory::Finance),
        "health" => Ok(DocumentCategory::Health),
        "housing" => Ok(DocumentCategory::Housing),
        "vehicles" => Ok(DocumentCategory::Vehicles),
        "resume" => Ok(DocumentCategory::Resume),
        "other" => Ok(DocumentCategory::Other),
        _ => Err(DocumentRepositoryError::InvalidStoredValue("category")),
    }
}
fn status_to_str(value: DocumentStatus) -> &'static str {
    match value {
        DocumentStatus::Active => "active",
        DocumentStatus::Archived => "archived",
    }
}
fn status_from_str(value: &str) -> Result<DocumentStatus, DocumentRepositoryError> {
    match value {
        "active" => Ok(DocumentStatus::Active),
        "archived" => Ok(DocumentStatus::Archived),
        _ => Err(DocumentRepositoryError::InvalidStoredValue("status")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::repository::apply_migrations;

    fn document(name: &str, tags: &[&str]) -> Document {
        let mut document = Document::new(
            DocumentId::new(),
            DocumentName::new(name).unwrap(),
            DocumentCategory::Work,
            ManagedPdf::new(OriginalPdfName::new(format!("{name}.pdf")).unwrap(), 42).unwrap(),
            None,
            None,
            SystemTime::now(),
        );
        document.set_tags(tags.iter().map(|tag| Tag::new(*tag).unwrap()).collect());
        document
    }

    #[test]
    fn migration_adds_documents_without_altering_meals_tables() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        for table in [
            "meals_products",
            "documents",
            "document_tags",
            "document_tag_links",
        ] {
            let exists: bool = connection
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1)",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert!(exists, "missing table {table}");
        }
    }

    #[test]
    fn create_get_and_list_preserve_order_and_share_normalized_tags() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let first = document("CV", &["Trabajo", "2026"]);
        let second = document("Contrato", &[" TRABAJO "]);
        let first_id = first.id();
        {
            let mut repository = DocumentRepository::new(&mut connection);
            repository.create(&first).unwrap();
            repository.create(&second).unwrap();

            let restored = repository.find_by_id(first_id).unwrap().unwrap();
            assert_eq!(restored.name(), "CV");
            assert_eq!(
                restored.tags().iter().map(Tag::label).collect::<Vec<_>>(),
                vec!["Trabajo", "2026"]
            );
            assert_eq!(repository.list(DocumentStatus::Active).unwrap().len(), 2);
            assert!(repository.find_by_id(DocumentId::new()).unwrap().is_none());
        }
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM document_tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn document_survives_closing_and_reopening_sqlite() {
        let path =
            std::env::temp_dir().join(format!("nubeos-documents-{}.sqlite3", uuid::Uuid::new_v4()));
        let expected = {
            let mut connection = Connection::open(&path).unwrap();
            apply_migrations(&mut connection).unwrap();
            let document = document("Título universitario", &[]);
            let id = document.id();
            DocumentRepository::new(&mut connection)
                .create(&document)
                .unwrap();
            id
        };
        let mut reopened = Connection::open(&path).unwrap();
        apply_migrations(&mut reopened).unwrap();
        let restored = DocumentRepository::new(&mut reopened)
            .find_by_id(expected)
            .unwrap()
            .unwrap();
        assert_eq!(restored.name(), "Título universitario");
        drop(reopened);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn query_combines_search_tags_favorites_expiry_and_sorting() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut cv = Document::new(
            DocumentId::new(),
            DocumentName::new("CV español").unwrap(),
            DocumentCategory::Resume,
            ManagedPdf::new(OriginalPdfName::new("curriculum.pdf").unwrap(), 10).unwrap(),
            None,
            Some(CivilDate::new(2026, 8, 13).unwrap()),
            SystemTime::now(),
        );
        cv.set_tags(vec![
            Tag::new("Trabajo").unwrap(),
            Tag::new("Español").unwrap(),
        ]);
        let cv_id = cv.id();
        let contract = document("Contrato", &["Trabajo"]);
        let mut repository = DocumentRepository::new(&mut connection);
        repository.create(&cv).unwrap();
        repository.create(&contract).unwrap();
        repository
            .set_favorite(cv_id, true, SystemTime::now())
            .unwrap();
        let found = repository
            .query(&DocumentQuery {
                status: DocumentStatus::Active,
                search: Some("curriculum".into()),
                category: Some(DocumentCategory::Resume),
                tags: vec![" trabajo ".into(), "ESPAÑOL".into()],
                favorites_only: true,
                expiry: Some(ExpiryFilter::Expired),
                sort: DocumentSort::ExpirySoonest,
                today: CivilDate::new(2026, 8, 14).unwrap(),
            })
            .unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id(), cv_id);
    }

    #[test]
    fn metadata_status_and_unused_tags_are_updated_atomically() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut value = document("Nómina", &["Trabajo", "2025"]);
        let id = value.id();
        let mut repository = DocumentRepository::new(&mut connection);
        repository.create(&value).unwrap();
        value.update_metadata(
            DocumentName::new("Nómina diciembre").unwrap(),
            DocumentCategory::Finance,
            None,
            None,
            vec![Tag::new("Finanzas").unwrap()],
            SystemTime::now(),
        );
        repository.save_metadata(&value).unwrap();
        repository
            .set_status(id, DocumentStatus::Archived, SystemTime::now())
            .unwrap();
        let restored = repository.find_by_id(id).unwrap().unwrap();
        assert_eq!(restored.status(), DocumentStatus::Archived);
        assert_eq!(restored.tags()[0].label(), "Finanzas");
        assert_eq!(repository.list_tags(None).unwrap(), vec!["Finanzas"]);
    }
}
