//! Almacén privado y temporal de portadas.

use std::{
    collections::HashMap,
    fmt, fs,
    path::{Path, PathBuf},
};

use uuid::Uuid;

use super::model::ManagedCover;

const MAX_COVER_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Debug, Clone)]
pub struct PendingCover {
    pub token: String,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
    path: PathBuf,
    extension: &'static str,
}

#[derive(Debug)]
pub struct CoverStore {
    covers: PathBuf,
    staging: PathBuf,
    pending: HashMap<String, PendingCover>,
}

impl CoverStore {
    pub fn open(root: PathBuf) -> Result<Self, CoverStoreError> {
        let covers = root.join("covers");
        let staging = root.join("staging");
        fs::create_dir_all(&covers)?;
        fs::create_dir_all(&staging)?;
        Ok(Self {
            covers,
            staging,
            pending: HashMap::new(),
        })
    }

    pub fn prepare(&mut self, source: &Path) -> Result<PendingCover, CoverStoreError> {
        let metadata = fs::metadata(source)?;
        if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_COVER_BYTES {
            return Err(CoverStoreError::InvalidImage);
        }
        let bytes = fs::read(source)?;
        let (mime_type, extension) = detect_image(&bytes).ok_or(CoverStoreError::InvalidImage)?;
        let source_extension = source
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if !extension_matches(source_extension, extension) {
            return Err(CoverStoreError::InvalidImage);
        }
        let token = Uuid::new_v4().to_string();
        let path = self.staging.join(format!("{token}.{extension}"));
        fs::copy(source, &path)?;
        let pending = PendingCover {
            token: token.clone(),
            original_name: source
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("portada")
                .to_owned(),
            mime_type: mime_type.to_owned(),
            size_bytes: metadata.len(),
            path,
            extension,
        };
        self.pending.insert(token, pending.clone());
        Ok(pending)
    }

    pub fn discard(&mut self, token: &str) -> Result<(), CoverStoreError> {
        let pending = self
            .pending
            .remove(token)
            .ok_or(CoverStoreError::UnknownToken)?;
        if pending.path.exists() {
            fs::remove_file(pending.path)?;
        }
        Ok(())
    }

    pub fn promote(&mut self, token: &str) -> Result<ManagedCover, CoverStoreError> {
        let pending = self
            .pending
            .remove(token)
            .ok_or(CoverStoreError::UnknownToken)?;
        let file_name = format!("{}.{}", Uuid::new_v4(), pending.extension);
        let destination = self.covers.join(&file_name);
        fs::rename(&pending.path, &destination)?;
        ManagedCover::new(file_name, pending.mime_type, pending.size_bytes)
            .map_err(|_| CoverStoreError::InvalidImage)
    }

    pub fn read(&self, cover: &ManagedCover) -> Result<Vec<u8>, CoverStoreError> {
        Ok(fs::read(self.path_for(cover)?)?)
    }

    pub fn delete(&self, cover: &ManagedCover) -> Result<(), CoverStoreError> {
        let path = self.path_for(cover)?;
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }

    fn path_for(&self, cover: &ManagedCover) -> Result<PathBuf, CoverStoreError> {
        if Path::new(&cover.file_name)
            .file_name()
            .and_then(|value| value.to_str())
            != Some(&cover.file_name)
        {
            return Err(CoverStoreError::InvalidImage);
        }
        Ok(self.covers.join(&cover.file_name))
    }
}

fn detect_image(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("image/jpeg", "jpg"))
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("image/png", "png"))
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(("image/webp", "webp"))
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some(("image/gif", "gif"))
    } else {
        None
    }
}

fn extension_matches(value: &str, detected: &str) -> bool {
    value.eq_ignore_ascii_case(detected)
        || (detected == "jpg" && value.eq_ignore_ascii_case("jpeg"))
}

#[derive(Debug)]
pub enum CoverStoreError {
    Io(std::io::Error),
    InvalidImage,
    UnknownToken,
}

impl fmt::Display for CoverStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "No se pudo gestionar la portada: {error}"),
            Self::InvalidImage => {
                formatter.write_str("Selecciona una imagen JPEG, PNG o WebP de hasta 8 MB.")
            }
            Self::UnknownToken => {
                formatter.write_str("La selección de portada ya no está disponible.")
            }
        }
    }
}

impl std::error::Error for CoverStoreError {}

impl From<std::io::Error> for CoverStoreError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copied_cover_survives_moving_the_original() {
        let root = std::env::temp_dir().join(format!("nubeos-covers-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let source = root.join("cover.png");
        fs::write(&source, [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 1]).unwrap();
        let mut store = CoverStore::open(root.join("private")).unwrap();
        let pending = store.prepare(&source).unwrap();
        fs::remove_file(source).unwrap();
        let cover = store.promote(&pending.token).unwrap();
        assert_eq!(store.read(&cover).unwrap().len(), 9);
        fs::remove_dir_all(root).unwrap();
    }
}
