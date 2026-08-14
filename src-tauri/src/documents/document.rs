//! Tipos de dominio fundamentales de Documentos.
//!
//! Este módulo no conoce Tauri, SQLite, React ni el sistema de archivos. Sus
//! tipos impiden representar documentos con nombres, fechas o información de
//! PDF evidentemente inválidos.

use std::{fmt, time::SystemTime};

use uuid::Uuid;

use super::tag::Tag;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DocumentError {
    EmptyName,
    InvalidOriginalFileName,
    EmptyManagedPdf,
    InvalidDate,
    InvalidDocumentId,
}

impl fmt::Display for DocumentError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyName => write!(formatter, "El nombre del documento es obligatorio."),
            Self::InvalidOriginalFileName => {
                write!(formatter, "El nombre original del PDF no es válido.")
            }
            Self::EmptyManagedPdf => write!(formatter, "El PDF no puede estar vacío."),
            Self::InvalidDate => write!(formatter, "La fecha indicada no es válida."),
            Self::InvalidDocumentId => {
                write!(formatter, "El identificador del documento no es válido.")
            }
        }
    }
}

impl std::error::Error for DocumentError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct DocumentId(Uuid);

impl DocumentId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(value: &str) -> Result<Self, DocumentError> {
        Uuid::parse_str(value)
            .map(Self)
            .map_err(|_| DocumentError::InvalidDocumentId)
    }

    pub fn as_uuid(self) -> Uuid {
        self.0
    }

    pub fn stored_file_name(self) -> String {
        format!("{}.pdf", self.0)
    }
}

impl Default for DocumentId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for DocumentId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocumentName(String);

impl DocumentName {
    pub fn new(value: impl Into<String>) -> Result<Self, DocumentError> {
        let value = value.into().trim().to_owned();
        if value.is_empty() {
            return Err(DocumentError::EmptyName);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OriginalPdfName(String);

impl OriginalPdfName {
    pub fn new(value: impl Into<String>) -> Result<Self, DocumentError> {
        let value = value.into().trim().to_owned();
        let is_pdf = value
            .rsplit_once('.')
            .is_some_and(|(_, extension)| extension.eq_ignore_ascii_case("pdf"));
        let is_single_name = !value.contains(['/', '\\', '\0']);
        if value.is_empty() || matches!(value.as_str(), "." | "..") || !is_pdf || !is_single_name {
            return Err(DocumentError::InvalidOriginalFileName);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManagedPdf {
    original_file_name: OriginalPdfName,
    size_bytes: u64,
}

impl ManagedPdf {
    pub fn new(
        original_file_name: OriginalPdfName,
        size_bytes: u64,
    ) -> Result<Self, DocumentError> {
        if size_bytes == 0 {
            return Err(DocumentError::EmptyManagedPdf);
        }
        Ok(Self {
            original_file_name,
            size_bytes,
        })
    }

    pub fn original_file_name(&self) -> &OriginalPdfName {
        &self.original_file_name
    }

    pub fn size_bytes(&self) -> u64 {
        self.size_bytes
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DocumentCategory {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DocumentStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct CivilDate {
    year: u16,
    month: u8,
    day: u8,
}

impl CivilDate {
    pub fn new(year: u16, month: u8, day: u8) -> Result<Self, DocumentError> {
        if !(1..=9999).contains(&year)
            || !(1..=12).contains(&month)
            || day == 0
            || day > days_in_month(year, month)
        {
            return Err(DocumentError::InvalidDate);
        }
        Ok(Self { year, month, day })
    }

    pub fn year(self) -> u16 {
        self.year
    }

    pub fn month(self) -> u8 {
        self.month
    }

    pub fn day(self) -> u8 {
        self.day
    }
}

fn days_in_month(year: u16, month: u8) -> u8 {
    match month {
        2 if is_leap_year(year) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

fn is_leap_year(year: u16) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Document {
    id: DocumentId,
    name: DocumentName,
    category: DocumentCategory,
    document_date: Option<CivilDate>,
    expires_on: Option<CivilDate>,
    favorite: bool,
    status: DocumentStatus,
    pdf: ManagedPdf,
    imported_at: SystemTime,
    updated_at: SystemTime,
    tags: Vec<Tag>,
}

impl Document {
    pub fn new(
        id: DocumentId,
        name: DocumentName,
        category: DocumentCategory,
        pdf: ManagedPdf,
        document_date: Option<CivilDate>,
        expires_on: Option<CivilDate>,
        imported_at: SystemTime,
    ) -> Self {
        Self {
            id,
            name,
            category,
            document_date,
            expires_on,
            favorite: false,
            status: DocumentStatus::Active,
            pdf,
            imported_at,
            updated_at: imported_at,
            tags: Vec::new(),
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn rehydrate(
        id: DocumentId,
        name: DocumentName,
        category: DocumentCategory,
        pdf: ManagedPdf,
        document_date: Option<CivilDate>,
        expires_on: Option<CivilDate>,
        favorite: bool,
        status: DocumentStatus,
        imported_at: SystemTime,
        updated_at: SystemTime,
        tags: Vec<Tag>,
    ) -> Self {
        Self {
            id,
            name,
            category,
            document_date,
            expires_on,
            favorite,
            status,
            pdf,
            imported_at,
            updated_at,
            tags: Tag::deduplicate(tags),
        }
    }

    pub fn id(&self) -> DocumentId {
        self.id
    }

    pub fn name(&self) -> &str {
        self.name.as_str()
    }

    pub fn category(&self) -> DocumentCategory {
        self.category
    }

    pub fn document_date(&self) -> Option<CivilDate> {
        self.document_date
    }

    pub fn expires_on(&self) -> Option<CivilDate> {
        self.expires_on
    }

    pub fn is_favorite(&self) -> bool {
        self.favorite
    }

    pub fn status(&self) -> DocumentStatus {
        self.status
    }

    pub fn pdf(&self) -> &ManagedPdf {
        &self.pdf
    }

    pub fn imported_at(&self) -> SystemTime {
        self.imported_at
    }

    pub fn updated_at(&self) -> SystemTime {
        self.updated_at
    }

    pub fn tags(&self) -> &[Tag] {
        &self.tags
    }

    pub fn set_tags(&mut self, tags: Vec<Tag>) {
        self.tags = Tag::deduplicate(tags);
    }

    pub fn update_metadata(
        &mut self,
        name: DocumentName,
        category: DocumentCategory,
        document_date: Option<CivilDate>,
        expires_on: Option<CivilDate>,
        tags: Vec<Tag>,
        updated_at: SystemTime,
    ) {
        self.name = name;
        self.category = category;
        self.document_date = document_date;
        self.expires_on = expires_on;
        self.tags = Tag::deduplicate(tags);
        self.updated_at = updated_at;
    }

    pub fn set_favorite(&mut self, favorite: bool, updated_at: SystemTime) {
        self.favorite = favorite;
        self.updated_at = updated_at;
    }

    pub fn archive(&mut self, updated_at: SystemTime) {
        self.status = DocumentStatus::Archived;
        self.updated_at = updated_at;
    }

    pub fn restore(&mut self, updated_at: SystemTime) {
        self.status = DocumentStatus::Active;
        self.updated_at = updated_at;
    }

    pub fn replace_pdf(&mut self, pdf: ManagedPdf, updated_at: SystemTime) {
        self.pdf = pdf;
        self.updated_at = updated_at;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_name_is_trimmed_and_cannot_be_empty() {
        assert_eq!(DocumentName::new("  DNI  ").unwrap().as_str(), "DNI");
        assert_eq!(DocumentName::new("   "), Err(DocumentError::EmptyName));
    }

    #[test]
    fn document_id_generates_a_safe_stored_pdf_name_and_can_be_parsed() {
        let id = DocumentId::new();
        let stored_name = id.stored_file_name();

        assert_eq!(stored_name, format!("{id}.pdf"));
        assert!(!stored_name.contains(['/', '\\']));
        assert_eq!(DocumentId::parse(&id.to_string()).unwrap(), id);
        assert_eq!(
            DocumentId::parse("../dni"),
            Err(DocumentError::InvalidDocumentId)
        );
    }

    #[test]
    fn managed_pdf_requires_a_plain_pdf_name_and_non_empty_size() {
        let name = OriginalPdfName::new("DNI.PDF").unwrap();
        assert!(ManagedPdf::new(name.clone(), 1).is_ok());
        assert_eq!(
            ManagedPdf::new(name, 0),
            Err(DocumentError::EmptyManagedPdf)
        );
        assert_eq!(
            OriginalPdfName::new("../DNI.pdf"),
            Err(DocumentError::InvalidOriginalFileName)
        );
        assert_eq!(
            OriginalPdfName::new("DNI.png"),
            Err(DocumentError::InvalidOriginalFileName)
        );
    }

    #[test]
    fn civil_date_validates_calendar_days_and_leap_years() {
        assert!(CivilDate::new(2024, 2, 29).is_ok());
        assert_eq!(CivilDate::new(2025, 2, 29), Err(DocumentError::InvalidDate));
        assert_eq!(CivilDate::new(2026, 13, 1), Err(DocumentError::InvalidDate));
        assert_eq!(
            CivilDate::new(10_000, 1, 1),
            Err(DocumentError::InvalidDate)
        );
    }

    #[test]
    fn new_document_is_active_and_accepts_an_expiry_before_its_document_date() {
        let now = SystemTime::now();
        let document = Document::new(
            DocumentId::new(),
            DocumentName::new("Documento antiguo").unwrap(),
            DocumentCategory::Other,
            ManagedPdf::new(OriginalPdfName::new("antiguo.pdf").unwrap(), 420).unwrap(),
            Some(CivilDate::new(2026, 8, 10).unwrap()),
            Some(CivilDate::new(2020, 1, 1).unwrap()),
            now,
        );

        assert_eq!(document.status(), DocumentStatus::Active);
        assert!(!document.is_favorite());
        assert_eq!(document.imported_at(), document.updated_at());
        assert!(document.expires_on() < document.document_date());
    }
}
