//! Etiquetas libres y reutilizables de Documentos.

use std::fmt;

use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TagError {
    EmptyLabel,
    InvalidId,
}

impl fmt::Display for TagError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyLabel => write!(formatter, "La etiqueta no puede estar vacía."),
            Self::InvalidId => write!(formatter, "El identificador de etiqueta no es válido."),
        }
    }
}

impl std::error::Error for TagError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TagId(Uuid);

impl TagId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(value: &str) -> Result<Self, TagError> {
        Uuid::parse_str(value)
            .map(Self)
            .map_err(|_| TagError::InvalidId)
    }
}

impl Default for TagId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for TagId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tag {
    id: TagId,
    label: String,
    normalized_label: String,
}

impl Tag {
    pub fn new(label: impl Into<String>) -> Result<Self, TagError> {
        Self::with_id(TagId::new(), label)
    }

    pub fn with_id(id: TagId, label: impl Into<String>) -> Result<Self, TagError> {
        let label = collapse_spaces(&label.into());
        if label.is_empty() {
            return Err(TagError::EmptyLabel);
        }
        let normalized_label = label.to_lowercase();
        Ok(Self {
            id,
            label,
            normalized_label,
        })
    }

    pub fn id(&self) -> TagId {
        self.id
    }

    pub fn label(&self) -> &str {
        &self.label
    }

    pub fn normalized_label(&self) -> &str {
        &self.normalized_label
    }

    pub fn deduplicate(tags: Vec<Self>) -> Vec<Self> {
        let mut unique = Vec::with_capacity(tags.len());
        for tag in tags {
            if !unique
                .iter()
                .any(|existing: &Tag| existing.normalized_label == tag.normalized_label)
            {
                unique.push(tag);
            }
        }
        unique
    }
}

fn collapse_spaces(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_spacing_and_case_without_changing_visible_label() {
        let tag = Tag::new("  Vida   laboral  ").unwrap();
        assert_eq!(tag.label(), "Vida laboral");
        assert_eq!(tag.normalized_label(), "vida laboral");
        assert_eq!(Tag::new("   "), Err(TagError::EmptyLabel));
    }

    #[test]
    fn deduplication_keeps_the_first_visible_spelling() {
        let tags = Tag::deduplicate(vec![
            Tag::new("Nómina").unwrap(),
            Tag::new("  NÓMINA ").unwrap(),
            Tag::new("2026").unwrap(),
        ]);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].label(), "Nómina");
    }
}
