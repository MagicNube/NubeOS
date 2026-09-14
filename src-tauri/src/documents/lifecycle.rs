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
    store.begin_replacement(id, token)?;
    let retired = match store.retire(id) {
        Ok(path) => path,
        Err(error) => {
            store.finish_replacement(id)?;
            return Err(error.into());
        }
    };
    if let Err(error) = store.promote(&pending, id) {
        store.restore_retired(&retired, id)?;
        store.finish_replacement(id)?;
        return Err(error.into());
    }
    let now = SystemTime::now();
    if let Err(error) = DocumentRepository::update_pdf_in_transaction(
        &transaction,
        id,
        pending.original_name().as_str(),
        pending.size_bytes(),
        now,
        &token.to_string(),
    ) {
        store.rollback_promotion(&pending, id)?;
        store.restore_retired(&retired, id)?;
        store.finish_replacement(id)?;
        return Err(error.into());
    }
    if let Err(error) = transaction.commit() {
        store.rollback_promotion(&pending, id)?;
        store.restore_retired(&retired, id)?;
        store.finish_replacement(id)?;
        return Err(DocumentRepositoryError::from(error).into());
    }
    store.consume(token)?;
    store.remove_retired(&retired)?;
    store.finish_replacement(id)?;
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
    fn replacement_recovers_every_interruption_boundary_with_identical_metadata() {
        for stage in 0..=6 {
            let root = root();
            fs::create_dir_all(&root).unwrap();
            let db_path = root.join("test.sqlite3");
            let mut connection = Connection::open(&db_path).unwrap();
            apply_migrations(&mut connection).unwrap();
            let mut store = PdfStore::open(root.join("private")).unwrap();
            let id = imported(&mut connection, &mut store, &root);
            // Same name and length, different bytes: metadata cannot identify a version.
            fs::write(root.join("old.pdf"), b"%PDF-1.7\nnew").unwrap();
            let pending = store.prepare(&root.join("old.pdf")).unwrap();
            let transaction = connection.transaction().unwrap();
            store.begin_replacement(id, pending.token()).unwrap();
            let retired = if stage >= 1 {
                Some(store.retire(id).unwrap())
            } else {
                None
            };
            if stage >= 2 {
                store.promote(&pending, id).unwrap();
            }
            if stage >= 3 {
                DocumentRepository::update_pdf_in_transaction(
                    &transaction,
                    id,
                    pending.original_name().as_str(),
                    pending.size_bytes(),
                    SystemTime::now(),
                    &pending.token().to_string(),
                )
                .unwrap();
            }
            if stage >= 4 {
                transaction.commit().unwrap();
            } else {
                drop(transaction);
            }
            if stage >= 5 {
                store.remove_retired(retired.as_ref().unwrap()).unwrap();
            }
            if stage >= 6 {
                store.finish_replacement(id).unwrap();
            }
            drop(store);
            drop(connection);

            let mut connection = Connection::open(&db_path).unwrap();
            let revisions = DocumentRepository::new(&mut connection)
                .pdf_revisions()
                .unwrap();
            let referenced = DocumentRepository::new(&mut connection)
                .stored_file_names()
                .unwrap()
                .into_iter()
                .collect();
            let store = PdfStore::open(root.join("private")).unwrap();
            for _ in 0..2 {
                store.reconcile_replacements(&revisions).unwrap();
                store.reconcile(&referenced).unwrap();
                let expected = if stage >= 4 {
                    b"%PDF-1.7\nnew"
                } else {
                    b"%PDF-1.7\nold"
                };
                assert_eq!(store.read(id).unwrap(), expected, "stage {stage}");
                let document = DocumentRepository::new(&mut connection)
                    .find_by_id(id)
                    .unwrap()
                    .unwrap();
                assert_eq!(document.pdf().original_file_name().as_str(), "old.pdf");
                assert_eq!(document.pdf().size_bytes(), expected.len() as u64);
            }
            drop(connection);
            fs::remove_dir_all(root).unwrap();
        }
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
