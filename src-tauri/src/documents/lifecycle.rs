//! Casos de uso que coordinan metadatos y archivos administrados.

use std::{fmt, time::SystemTime};

use rusqlite::Connection;

use super::{
    document::{DocumentId, ManagedPdf},
    repository::{DocumentRepository, DocumentRepositoryError},
    store::{PdfStore, PdfStoreError, PendingPdfToken},
};

#[derive(Debug)]
pub enum LifecycleError {
    Repository(DocumentRepositoryError),
    Store(PdfStoreError),
}
impl fmt::Display for LifecycleError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Repository(error) => error.fmt(formatter),
            Self::Store(error) => error.fmt(formatter),
        }
    }
}
impl std::error::Error for LifecycleError {}
impl From<DocumentRepositoryError> for LifecycleError {
    fn from(value: DocumentRepositoryError) -> Self {
        Self::Repository(value)
    }
}
impl From<PdfStoreError> for LifecycleError {
    fn from(value: PdfStoreError) -> Self {
        Self::Store(value)
    }
}

pub fn delete_document(
    connection: &mut Connection,
    store: &PdfStore,
    id: DocumentId,
) -> Result<(), LifecycleError> {
    let transaction = connection
        .transaction()
        .map_err(DocumentRepositoryError::from)?;
    let retired = store.retire(id)?;
    if let Err(error) = DocumentRepository::delete_in_transaction(&transaction, id) {
        store.restore_retired(&retired, id)?;
        return Err(error.into());
    }
    if let Err(error) = transaction.commit() {
        store.restore_retired(&retired, id)?;
        return Err(DocumentRepositoryError::from(error).into());
    }
    store.remove_retired(&retired)?;
    Ok(())
}

pub fn replace_pdf(
    connection: &mut Connection,
    store: &mut PdfStore,
    id: DocumentId,
    token: PendingPdfToken,
) -> Result<ManagedPdf, LifecycleError> {
    let pending = store.pending(token)?;
    let transaction = connection
        .transaction()
        .map_err(DocumentRepositoryError::from)?;
    let retired = store.retire(id)?;
    if let Err(error) = store.promote(&pending, id) {
        store.restore_retired(&retired, id)?;
        return Err(error.into());
    }
    let now = SystemTime::now();
    if let Err(error) = DocumentRepository::update_pdf_in_transaction(
        &transaction,
        id,
        pending.original_name().as_str(),
        pending.size_bytes(),
        now,
    ) {
        store.rollback_promotion(&pending, id)?;
        store.restore_retired(&retired, id)?;
        return Err(error.into());
    }
    if let Err(error) = transaction.commit() {
        store.rollback_promotion(&pending, id)?;
        store.restore_retired(&retired, id)?;
        return Err(DocumentRepositoryError::from(error).into());
    }
    store.consume(token)?;
    store.remove_retired(&retired)?;
    ManagedPdf::new(pending.original_name().clone(), pending.size_bytes())
        .map_err(|error| DocumentRepositoryError::InvalidDocument(error).into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::documents::{
        document::{DocumentCategory, DocumentStatus},
        import::{import_document, ImportDocumentInput},
    };
    use crate::meals::repository::apply_migrations;
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!("nubeos-lifecycle-{}", Uuid::new_v4()))
    }
    fn imported(
        connection: &mut Connection,
        store: &mut PdfStore,
        root: &std::path::Path,
    ) -> DocumentId {
        let source = root.join("old.pdf");
        fs::write(&source, b"%PDF-1.7\nold").unwrap();
        let pending = store.prepare(&source).unwrap();
        import_document(
            connection,
            store,
            ImportDocumentInput {
                name: "CV".into(),
                category: DocumentCategory::Resume,
                document_date: None,
                expires_on: None,
                tags: vec![],
                pending_token: pending.token(),
            },
        )
        .unwrap()
        .id()
    }

    #[test]
    fn active_document_cannot_be_deleted_and_its_pdf_is_restored() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let mut store = PdfStore::open(root.join("private")).unwrap();
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let id = imported(&mut connection, &mut store, &root);
        assert!(delete_document(&mut connection, &store, id).is_err());
        assert!(store.final_path(id).exists());
        assert!(DocumentRepository::new(&mut connection)
            .find_by_id(id)
            .unwrap()
            .is_some());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn archived_document_is_deleted_and_pdf_replacement_is_atomic() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let mut store = PdfStore::open(root.join("private")).unwrap();
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let id = imported(&mut connection, &mut store, &root);
        let replacement = root.join("new.pdf");
        fs::write(&replacement, b"%PDF-1.7\nnew version").unwrap();
        let pending = store.prepare(&replacement).unwrap();
        replace_pdf(&mut connection, &mut store, id, pending.token()).unwrap();
        assert_eq!(store.read(id).unwrap(), b"%PDF-1.7\nnew version");
        assert!(replacement.exists());
        DocumentRepository::new(&mut connection)
            .set_status(id, DocumentStatus::Archived, SystemTime::now())
            .unwrap();
        delete_document(&mut connection, &store, id).unwrap();
        assert!(!store.final_path(id).exists());
        assert!(DocumentRepository::new(&mut connection)
            .find_by_id(id)
            .unwrap()
            .is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_pdf_metadata_update_restores_the_previous_file() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let mut store = PdfStore::open(root.join("private")).unwrap();
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let id = imported(&mut connection, &mut store, &root);
        let replacement = root.join("new.pdf");
        fs::write(&replacement, b"%PDF-1.7\nnew version").unwrap();
        let pending = store.prepare(&replacement).unwrap();
        connection
            .execute_batch(
                "CREATE TRIGGER reject_document_pdf_update
                 BEFORE UPDATE OF original_file_name ON documents
                 BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;",
            )
            .unwrap();

        assert!(replace_pdf(&mut connection, &mut store, id, pending.token()).is_err());
        assert_eq!(store.read(id).unwrap(), b"%PDF-1.7\nold");
        let document = DocumentRepository::new(&mut connection)
            .find_by_id(id)
            .unwrap()
            .unwrap();
        assert_eq!(document.pdf().original_file_name().as_str(), "old.pdf");
        store.discard(pending.token()).unwrap();

        fs::remove_dir_all(root).unwrap();
    }
}
