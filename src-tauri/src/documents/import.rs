//! Caso de uso de importación coordinada entre SQLite y el almacén de PDFs.

use std::{fmt, time::SystemTime};

use rusqlite::Connection;

use super::{
    document::{
        CivilDate, Document, DocumentCategory, DocumentError, DocumentId, DocumentName, ManagedPdf,
    },
    repository::{DocumentRepository, DocumentRepositoryError},
    store::{PdfStore, PdfStoreError, PendingPdfToken},
    tag::{Tag, TagError},
};

pub struct ImportDocumentInput {
    pub name: String,
    pub category: DocumentCategory,
    pub document_date: Option<CivilDate>,
    pub expires_on: Option<CivilDate>,
    pub tags: Vec<String>,
    pub pending_token: PendingPdfToken,
}

#[derive(Debug)]
pub enum ImportDocumentError {
    Document(DocumentError),
    Tag(TagError),
    Repository(DocumentRepositoryError),
    Store(PdfStoreError),
    Interrupted,
}

impl fmt::Display for ImportDocumentError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Document(error) => error.fmt(formatter),
            Self::Tag(error) => error.fmt(formatter),
            Self::Repository(error) => error.fmt(formatter),
            Self::Store(error) => error.fmt(formatter),
            Self::Interrupted => write!(
                formatter,
                "La importación se interrumpió antes de confirmarse."
            ),
        }
    }
}
impl std::error::Error for ImportDocumentError {}
impl From<DocumentError> for ImportDocumentError {
    fn from(v: DocumentError) -> Self {
        Self::Document(v)
    }
}
impl From<TagError> for ImportDocumentError {
    fn from(v: TagError) -> Self {
        Self::Tag(v)
    }
}
impl From<DocumentRepositoryError> for ImportDocumentError {
    fn from(v: DocumentRepositoryError) -> Self {
        Self::Repository(v)
    }
}
impl From<PdfStoreError> for ImportDocumentError {
    fn from(v: PdfStoreError) -> Self {
        Self::Store(v)
    }
}

pub fn import_document(
    connection: &mut Connection,
    store: &mut PdfStore,
    input: ImportDocumentInput,
) -> Result<Document, ImportDocumentError> {
    import_with_hook(connection, store, input, || Ok(()))
}

fn import_with_hook(
    connection: &mut Connection,
    store: &mut PdfStore,
    input: ImportDocumentInput,
    before_commit: impl FnOnce() -> Result<(), ImportDocumentError>,
) -> Result<Document, ImportDocumentError> {
    let pending = store.pending(input.pending_token)?;
    let mut document = Document::new(
        DocumentId::new(),
        DocumentName::new(input.name)?,
        input.category,
        ManagedPdf::new(pending.original_name().clone(), pending.size_bytes())?,
        input.document_date,
        input.expires_on,
        SystemTime::now(),
    );
    document.set_tags(
        input
            .tags
            .into_iter()
            .map(Tag::new)
            .collect::<Result<Vec<_>, _>>()?,
    );

    let transaction = connection
        .transaction()
        .map_err(DocumentRepositoryError::from)?;
    DocumentRepository::insert_in_transaction(&transaction, &document)?;
    store.promote(&pending, document.id())?;
    if let Err(error) = before_commit() {
        store.rollback_promotion(&pending, document.id())?;
        return Err(error);
    }
    if let Err(error) = transaction.commit() {
        store.rollback_promotion(&pending, document.id())?;
        return Err(DocumentRepositoryError::from(error).into());
    }
    store.consume(pending.token())?;
    Ok(document)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::repository::apply_migrations;
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!("nubeos-import-{}", Uuid::new_v4()))
    }
    fn input(token: PendingPdfToken) -> ImportDocumentInput {
        ImportDocumentInput {
            name: "CV español".into(),
            category: DocumentCategory::Resume,
            document_date: None,
            expires_on: None,
            tags: vec!["Trabajo".into()],
            pending_token: token,
        }
    }

    #[test]
    fn imports_one_record_and_one_managed_pdf_without_touching_source() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let source = root.join("cv.pdf");
        fs::write(&source, b"%PDF-1.7\nCV").unwrap();
        let mut store = PdfStore::open(root.join("documents")).unwrap();
        let pending = store.prepare(&source).unwrap();
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let document =
            import_document(&mut connection, &mut store, input(pending.token())).unwrap();
        assert!(source.exists());
        assert!(store.final_path(document.id()).exists());
        assert!(matches!(
            store.pending(pending.token()),
            Err(PdfStoreError::UnknownToken)
        ));
        assert!(DocumentRepository::new(&mut connection)
            .find_by_id(document.id())
            .unwrap()
            .is_some());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn simulated_interruption_restores_the_prepared_pdf_and_rolls_back_sqlite() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let source = root.join("cv.pdf");
        fs::write(&source, b"%PDF-1.7\nCV").unwrap();
        let mut store = PdfStore::open(root.join("documents")).unwrap();
        let pending = store.prepare(&source).unwrap();
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let result = import_with_hook(&mut connection, &mut store, input(pending.token()), || {
            Err(ImportDocumentError::Interrupted)
        });
        assert!(matches!(result, Err(ImportDocumentError::Interrupted)));
        assert!(store.pending(pending.token()).is_ok());
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
        fs::remove_dir_all(root).unwrap();
    }
}
