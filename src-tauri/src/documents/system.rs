//! Adaptadores de sistema operativo del módulo Documentos.

use std::{fmt, path::Path};

#[derive(Debug)]
pub struct FileClipboardError(pub String);
impl fmt::Display for FileClipboardError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}
impl std::error::Error for FileClipboardError {}

pub trait FileClipboard {
    fn copy_file(&self, path: &Path) -> Result<(), FileClipboardError>;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct SystemFileClipboard;

#[cfg(windows)]
impl FileClipboard for SystemFileClipboard {
    fn copy_file(&self, path: &Path) -> Result<(), FileClipboardError> {
        use clipboard_win::Setter;

        let path = path.to_str().ok_or_else(|| {
            FileClipboardError("La ruta del PDF no puede representarse en Windows.".into())
        })?;
        let _clipboard = clipboard_win::Clipboard::new_attempts(10).map_err(|error| {
            FileClipboardError(format!(
                "El portapapeles está ocupado o no está disponible: {error}"
            ))
        })?;
        clipboard_win::formats::FileList
            .write_clipboard(&[path])
            .map_err(|error| FileClipboardError(format!("No se pudo copiar el PDF: {error}")))
    }
}

#[cfg(not(windows))]
impl FileClipboard for SystemFileClipboard {
    fn copy_file(&self, _path: &Path) -> Result<(), FileClipboardError> {
        Err(FileClipboardError(
            "Copiar archivos solo está disponible en Windows 11.".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    struct FakeClipboard;
    impl FileClipboard for FakeClipboard {
        fn copy_file(&self, path: &Path) -> Result<(), FileClipboardError> {
            if path.extension().and_then(|value| value.to_str()) == Some("pdf") {
                Ok(())
            } else {
                Err(FileClipboardError("no es PDF".into()))
            }
        }
    }
    #[test]
    fn clipboard_port_can_be_tested_without_touching_windows() {
        assert!(FakeClipboard.copy_file(Path::new("document.pdf")).is_ok());
        assert!(FakeClipboard.copy_file(Path::new("document.txt")).is_err());
    }
}
