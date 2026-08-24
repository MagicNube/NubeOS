use super::model::ManagedGameCover;
use std::{
    collections::HashMap,
    fmt, fs,
    path::{Path, PathBuf},
};
use uuid::Uuid;

const MAX_COVER_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Debug, Clone)]
pub struct PendingGameCover {
    pub token: String,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
    path: PathBuf,
    extension: &'static str,
}

pub struct GameCoverStore {
    covers: PathBuf,
    staging: PathBuf,
    pending: HashMap<String, PendingGameCover>,
}

impl GameCoverStore {
    pub fn open(root: PathBuf) -> Result<Self, GameCoverError> {
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
    pub fn prepare(&mut self, source: &Path) -> Result<PendingGameCover, GameCoverError> {
        let metadata = fs::metadata(source)?;
        if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_COVER_BYTES {
            return Err(GameCoverError::InvalidImage);
        }
        let bytes = fs::read(source)?;
        let (mime, extension) = detect_image(&bytes).ok_or(GameCoverError::InvalidImage)?;
        let source_extension = source
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or_default();
        if !source_extension.eq_ignore_ascii_case(extension)
            && !(extension == "jpg" && source_extension.eq_ignore_ascii_case("jpeg"))
        {
            return Err(GameCoverError::InvalidImage);
        }
        let token = Uuid::new_v4().to_string();
        let path = self.staging.join(format!("{token}.{extension}"));
        fs::copy(source, &path)?;
        let pending = PendingGameCover {
            token: token.clone(),
            original_name: source
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("portada")
                .to_owned(),
            mime_type: mime.into(),
            size_bytes: metadata.len(),
            path,
            extension,
        };
        self.pending.insert(token, pending.clone());
        Ok(pending)
    }
    pub fn prepare_jpeg_bytes(&mut self, bytes: &[u8]) -> Result<PendingGameCover, GameCoverError> {
        if bytes.is_empty()
            || bytes.len() as u64 > MAX_COVER_BYTES
            || !bytes.starts_with(&[0xFF, 0xD8, 0xFF])
        {
            return Err(GameCoverError::InvalidImage);
        }
        let token = Uuid::new_v4().to_string();
        let path = self.staging.join(format!("{token}.jpg"));
        fs::write(&path, bytes)?;
        let pending = PendingGameCover {
            token: token.clone(),
            original_name: "portada-pegada.jpg".into(),
            mime_type: "image/jpeg".into(),
            size_bytes: bytes.len() as u64,
            path,
            extension: "jpg",
        };
        self.pending.insert(token, pending.clone());
        Ok(pending)
    }
    pub fn discard(&mut self, token: &str) -> Result<(), GameCoverError> {
        let pending = self
            .pending
            .remove(token)
            .ok_or(GameCoverError::UnknownToken)?;
        if pending.path.exists() {
            fs::remove_file(pending.path)?;
        }
        Ok(())
    }
    pub fn promote(&mut self, token: &str) -> Result<ManagedGameCover, GameCoverError> {
        let pending = self
            .pending
            .remove(token)
            .ok_or(GameCoverError::UnknownToken)?;
        let name = format!("{}.{}", Uuid::new_v4(), pending.extension);
        fs::rename(&pending.path, self.covers.join(&name))?;
        ManagedGameCover::new(name, pending.mime_type, pending.size_bytes)
            .map_err(|_| GameCoverError::InvalidImage)
    }
    pub fn read(&self, cover: &ManagedGameCover) -> Result<Vec<u8>, GameCoverError> {
        Ok(fs::read(self.path_for(cover)?)?)
    }
    pub fn delete(&self, cover: &ManagedGameCover) -> Result<(), GameCoverError> {
        let path = self.path_for(cover)?;
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }
    fn path_for(&self, cover: &ManagedGameCover) -> Result<PathBuf, GameCoverError> {
        if Path::new(&cover.file_name)
            .file_name()
            .and_then(|v| v.to_str())
            != Some(&cover.file_name)
        {
            return Err(GameCoverError::InvalidImage);
        }
        Ok(self.covers.join(&cover.file_name))
    }
}

fn detect_image(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("image/jpeg", "jpg"))
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("image/png", "png"))
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        Some(("image/webp", "webp"))
    } else {
        None
    }
}

#[derive(Debug)]
pub enum GameCoverError {
    Io(std::io::Error),
    InvalidImage,
    UnknownToken,
}
impl fmt::Display for GameCoverError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(f, "No se pudo gestionar la portada: {error}"),
            Self::InvalidImage => {
                f.write_str("Selecciona una imagen JPEG, PNG o WebP de hasta 8 MB.")
            }
            Self::UnknownToken => f.write_str("La selección de portada ya no está disponible."),
        }
    }
}
impl std::error::Error for GameCoverError {}
impl From<std::io::Error> for GameCoverError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn copies_cover() {
        let root = std::env::temp_dir().join(format!("nubeos-game-covers-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let source = root.join("cover.png");
        fs::write(&source, [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 1]).unwrap();
        let mut store = GameCoverStore::open(root.join("private")).unwrap();
        let pending = store.prepare(&source).unwrap();
        fs::remove_file(source).unwrap();
        let cover = store.promote(&pending.token).unwrap();
        assert_eq!(store.read(&cover).unwrap().len(), 9);
        fs::remove_dir_all(root).unwrap();
    }
}
