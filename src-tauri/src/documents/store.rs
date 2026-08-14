//! Almacén privado de PDFs administrados.

use std::{
    collections::{HashMap, HashSet},
    fmt,
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
};

use uuid::Uuid;

use super::document::{DocumentId, OriginalPdfName};

#[derive(Debug)]
pub enum PdfStoreError {
    Io(std::io::Error),
    InvalidPdf,
    InvalidToken,
    UnknownToken,
    InvalidFileName,
}

impl fmt::Display for PdfStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "Error al gestionar el PDF: {error}"),
            Self::InvalidPdf => write!(formatter, "El archivo seleccionado no es un PDF válido."),
            Self::InvalidToken => write!(formatter, "El token temporal no es válido."),
            Self::UnknownToken => write!(formatter, "La selección temporal ya no está disponible."),
            Self::InvalidFileName => write!(formatter, "El nombre del PDF no es válido."),
        }
    }
}

impl std::error::Error for PdfStoreError {}
impl From<std::io::Error> for PdfStoreError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PendingPdfToken(Uuid);

impl PendingPdfToken {
    fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(value: &str) -> Result<Self, PdfStoreError> {
        Uuid::parse_str(value)
            .map(Self)
            .map_err(|_| PdfStoreError::InvalidToken)
    }
}

impl fmt::Display for PendingPdfToken {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

#[derive(Debug, Clone)]
pub struct PendingPdf {
    token: PendingPdfToken,
    original_name: OriginalPdfName,
    size_bytes: u64,
    staging_path: PathBuf,
}

impl PendingPdf {
    pub fn token(&self) -> PendingPdfToken {
        self.token
    }
    pub fn original_name(&self) -> &OriginalPdfName {
        &self.original_name
    }
    pub fn size_bytes(&self) -> u64 {
        self.size_bytes
    }
}

pub struct PdfStore {
    root: PathBuf,
    pending: HashMap<PendingPdfToken, PendingPdf>,
}

impl PdfStore {
    pub fn open(root: impl Into<PathBuf>) -> Result<Self, PdfStoreError> {
        let store = Self {
            root: root.into(),
            pending: HashMap::new(),
        };
        fs::create_dir_all(store.files_dir())?;
        fs::create_dir_all(store.staging_dir())?;
        fs::create_dir_all(store.recovery_dir())?;
        Ok(store)
    }

    pub fn prepare(&mut self, source: &Path) -> Result<PendingPdf, PdfStoreError> {
        validate_pdf(source)?;
        let file_name = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or(PdfStoreError::InvalidFileName)?;
        let original_name =
            OriginalPdfName::new(file_name).map_err(|_| PdfStoreError::InvalidFileName)?;
        let size_bytes = fs::metadata(source)?.len();
        let token = PendingPdfToken::new();
        let staging_path = self.staging_dir().join(format!("{token}.pending.pdf"));
        fs::copy(source, &staging_path)?;
        let pending = PendingPdf {
            token,
            original_name,
            size_bytes,
            staging_path,
        };
        self.pending.insert(token, pending.clone());
        Ok(pending)
    }

    pub fn pending(&self, token: PendingPdfToken) -> Result<PendingPdf, PdfStoreError> {
        self.pending
            .get(&token)
            .cloned()
            .ok_or(PdfStoreError::UnknownToken)
    }

    pub fn discard(&mut self, token: PendingPdfToken) -> Result<(), PdfStoreError> {
        let pending = self
            .pending
            .remove(&token)
            .ok_or(PdfStoreError::UnknownToken)?;
        remove_if_exists(&pending.staging_path)?;
        Ok(())
    }

    pub fn promote(&self, pending: &PendingPdf, id: DocumentId) -> Result<(), PdfStoreError> {
        if !self.pending.contains_key(&pending.token) {
            return Err(PdfStoreError::UnknownToken);
        }
        fs::rename(&pending.staging_path, self.final_path(id))?;
        Ok(())
    }

    pub fn rollback_promotion(
        &self,
        pending: &PendingPdf,
        id: DocumentId,
    ) -> Result<(), PdfStoreError> {
        let final_path = self.final_path(id);
        if final_path.exists() {
            fs::rename(final_path, &pending.staging_path)?;
        }
        Ok(())
    }

    pub fn consume(&mut self, token: PendingPdfToken) -> Result<(), PdfStoreError> {
        self.pending
            .remove(&token)
            .map(|_| ())
            .ok_or(PdfStoreError::UnknownToken)
    }

    pub fn final_path(&self, id: DocumentId) -> PathBuf {
        self.files_dir().join(id.stored_file_name())
    }

    pub fn read(&self, id: DocumentId) -> Result<Vec<u8>, PdfStoreError> {
        Ok(fs::read(self.final_path(id))?)
    }

    pub fn retire(&self, id: DocumentId) -> Result<PathBuf, PdfStoreError> {
        let source = self.final_path(id);
        let retired = self
            .staging_dir()
            .join(format!("retired-{}", id.stored_file_name()));
        fs::rename(source, &retired)?;
        Ok(retired)
    }

    pub fn restore_retired(&self, retired: &Path, id: DocumentId) -> Result<(), PdfStoreError> {
        if retired.exists() {
            fs::rename(retired, self.final_path(id))?;
        }
        Ok(())
    }

    pub fn remove_retired(&self, retired: &Path) -> Result<(), PdfStoreError> {
        remove_if_exists(retired)?;
        Ok(())
    }

    pub fn managed_path(&self, id: DocumentId) -> Result<PathBuf, PdfStoreError> {
        let path = self.final_path(id);
        if !path.is_file() {
            return Err(PdfStoreError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "PDF administrado ausente",
            )));
        }
        Ok(path)
    }

    pub fn reconcile(&self, referenced: &HashSet<String>) -> Result<(), PdfStoreError> {
        for entry in fs::read_dir(self.staging_dir())? {
            let path = entry?.path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if name.ends_with(".pending.pdf") {
                remove_if_exists(&path)?;
            } else if let Some(stored_name) = name.strip_prefix("retired-") {
                let final_path = self.files_dir().join(stored_name);
                if referenced.contains(stored_name) && !final_path.exists() {
                    fs::rename(path, final_path)?;
                } else {
                    self.move_to_recovery(&path, stored_name)?;
                }
            }
        }
        for entry in fs::read_dir(self.files_dir())? {
            let path = entry?.path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if !referenced.contains(name) {
                self.move_to_recovery(&path, name)?;
            }
        }
        Ok(())
    }

    fn move_to_recovery(&self, source: &Path, name: &str) -> Result<(), PdfStoreError> {
        let destination = self
            .recovery_dir()
            .join(format!("{}-{name}", Uuid::new_v4()));
        fs::rename(source, destination)?;
        Ok(())
    }
    fn files_dir(&self) -> PathBuf {
        self.root.join("files")
    }
    fn staging_dir(&self) -> PathBuf {
        self.root.join("staging")
    }
    fn recovery_dir(&self) -> PathBuf {
        self.root.join("recovery")
    }
}

fn validate_pdf(source: &Path) -> Result<(), PdfStoreError> {
    let metadata = fs::metadata(source).map_err(PdfStoreError::Io)?;
    let valid_extension = source
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("pdf"));
    if !metadata.is_file() || metadata.len() == 0 || !valid_extension {
        return Err(PdfStoreError::InvalidPdf);
    }
    let mut signature = [0_u8; 5];
    File::open(source)?
        .read_exact(&mut signature)
        .map_err(|_| PdfStoreError::InvalidPdf)?;
    if &signature != b"%PDF-" {
        return Err(PdfStoreError::InvalidPdf);
    }
    Ok(())
}

fn remove_if_exists(path: &Path) -> Result<(), std::io::Error> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!("nubeos-documents-{}", Uuid::new_v4()))
    }
    fn write(path: &Path, bytes: &[u8]) {
        fs::write(path, bytes).unwrap();
    }

    #[test]
    fn prepares_discards_and_consumes_valid_pdfs_once() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let source = root.join("CV.PDF");
        write(&source, b"%PDF-1.7\ncontent");
        let mut store = PdfStore::open(root.join("private")).unwrap();
        let pending = store.prepare(&source).unwrap();
        assert_eq!(pending.original_name().as_str(), "CV.PDF");
        store.discard(pending.token()).unwrap();
        assert!(matches!(
            store.discard(pending.token()),
            Err(PdfStoreError::UnknownToken)
        ));
        assert!(source.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_empty_fake_missing_and_non_pdf_files() {
        let root = root();
        fs::create_dir_all(&root).unwrap();
        let mut store = PdfStore::open(root.join("private")).unwrap();
        for (name, bytes) in [
            ("empty.pdf", b"".as_slice()),
            ("fake.pdf", b"hello"),
            ("image.png", b"%PDF-1.7"),
        ] {
            let path = root.join(name);
            write(&path, bytes);
            assert!(matches!(
                store.prepare(&path),
                Err(PdfStoreError::InvalidPdf)
            ));
        }
        assert!(store.prepare(&root.join("missing.pdf")).is_err());
        assert!(PendingPdfToken::parse("../escape").is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn reconciliation_is_idempotent_and_keeps_orphans_in_recovery() {
        let root = root();
        let external = root.with_extension("external.pdf");
        write(&external, b"%PDF-1.7");
        let store = PdfStore::open(&root).unwrap();
        let orphan = store.files_dir().join("orphan.pdf");
        write(&orphan, b"%PDF-1.7");
        let abandoned = store.staging_dir().join("old.pending.pdf");
        write(&abandoned, b"%PDF-1.7");
        store.reconcile(&HashSet::new()).unwrap();
        store.reconcile(&HashSet::new()).unwrap();
        assert!(!orphan.exists());
        assert!(!abandoned.exists());
        assert_eq!(fs::read_dir(store.recovery_dir()).unwrap().count(), 1);
        assert!(external.exists());
        fs::remove_dir_all(root).unwrap();
        fs::remove_file(external).unwrap();
    }
}
