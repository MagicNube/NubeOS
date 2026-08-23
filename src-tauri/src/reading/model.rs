use std::fmt;

use chrono::NaiveDate;
use uuid::Uuid;

const ALLOWED_GENRES: [&str; 10] = [
    "Fantasía",
    "Ciencia ficción",
    "Romance",
    "Misterio y suspense",
    "Terror",
    "Aventura",
    "Novela histórica",
    "Desarrollo personal",
    "Psicología",
    "Otro",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookId(String);

impl BookId {
    pub fn generate() -> Self {
        Self(Uuid::new_v4().to_string())
    }

    pub fn parse(value: &str) -> Result<Self, ReadingError> {
        Uuid::parse_str(value).map_err(|_| ReadingError::InvalidId)?;
        Ok(Self(value.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReadingStatus {
    Pending,
    Reading,
    Paused,
    Completed,
    Abandoned,
}

#[derive(Debug, Clone)]
pub struct BookDraft {
    pub title: String,
    pub author: String,
    pub genres: Vec<String>,
    pub status: ReadingStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManagedReadingCover {
    pub file_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

impl ManagedReadingCover {
    pub fn new(
        file_name: String,
        mime_type: String,
        size_bytes: u64,
    ) -> Result<Self, ReadingError> {
        if file_name.trim().is_empty()
            || !matches!(
                mime_type.as_str(),
                "image/jpeg" | "image/png" | "image/webp"
            )
            || size_bytes == 0
        {
            return Err(ReadingError::InvalidCover);
        }
        Ok(Self {
            file_name,
            mime_type,
            size_bytes,
        })
    }
}

#[derive(Debug, Clone)]
pub struct Book {
    pub id: BookId,
    pub title: String,
    pub author: String,
    pub genres: Vec<String>,
    pub status: ReadingStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
    pub cover: Option<ManagedReadingCover>,
    pub archived: bool,
    pub updated_at: String,
}

impl BookDraft {
    pub fn validate(mut self) -> Result<Self, ReadingError> {
        self.title = clean_required(self.title, 180)?;
        self.author = clean_required(self.author, 140)?;
        self.opinion = clean_optional(self.opinion, 5000)?;
        if self.score.is_some_and(|score| {
            !(0.0..=10.0).contains(&score)
                || ((score * 10.0) - (score * 10.0).round()).abs() > 0.000_001
        }) {
            return Err(ReadingError::InvalidScore);
        }
        if self
            .started_on
            .zip(self.finished_on)
            .is_some_and(|(start, end)| start > end)
        {
            return Err(ReadingError::InvalidDateRange);
        }
        let mut genres = Vec::new();
        for genre in self.genres {
            let genre = clean_required(genre, 50)?;
            if !ALLOWED_GENRES.contains(&genre.as_str()) {
                return Err(ReadingError::InvalidGenre);
            }
            if !genres.iter().any(|stored| stored == &genre) {
                genres.push(genre);
            }
        }
        if genres.len() > 20 {
            return Err(ReadingError::TooManyGenres);
        }
        self.genres = genres;
        Ok(self)
    }
}

impl Book {
    pub fn new(id: BookId, draft: BookDraft, updated_at: String) -> Result<Self, ReadingError> {
        let draft = draft.validate()?;
        Ok(Self {
            id,
            title: draft.title,
            author: draft.author,
            genres: draft.genres,
            status: draft.status,
            score: draft.score,
            opinion: draft.opinion,
            favorite: draft.favorite,
            started_on: draft.started_on,
            finished_on: draft.finished_on,
            cover: None,
            archived: false,
            updated_at,
        })
    }

    pub fn apply(&mut self, draft: BookDraft, updated_at: String) -> Result<(), ReadingError> {
        let draft = draft.validate()?;
        self.title = draft.title;
        self.author = draft.author;
        self.genres = draft.genres;
        self.status = draft.status;
        self.score = draft.score;
        self.opinion = draft.opinion;
        self.favorite = draft.favorite;
        self.started_on = draft.started_on;
        self.finished_on = draft.finished_on;
        self.updated_at = updated_at;
        Ok(())
    }
}

fn clean_required(value: String, limit: usize) -> Result<String, ReadingError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(ReadingError::RequiredText);
    }
    if value.chars().count() > limit {
        return Err(ReadingError::TextTooLong);
    }
    Ok(value)
}

fn clean_optional(value: Option<String>, limit: usize) -> Result<Option<String>, ReadingError> {
    let value = value
        .map(|text| text.trim().to_owned())
        .filter(|text| !text.is_empty());
    if value
        .as_ref()
        .is_some_and(|text| text.chars().count() > limit)
    {
        return Err(ReadingError::TextTooLong);
    }
    Ok(value)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReadingError {
    InvalidId,
    RequiredText,
    TextTooLong,
    TooManyGenres,
    InvalidGenre,
    InvalidScore,
    InvalidDateRange,
    InvalidCover,
}

impl fmt::Display for ReadingError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidId => "El identificador del libro no es válido.",
            Self::RequiredText => "El título y el autor son obligatorios.",
            Self::TextTooLong => "Uno de los textos supera la longitud permitida.",
            Self::TooManyGenres => "Un libro no puede tener más de 20 géneros.",
            Self::InvalidGenre => "Selecciona los géneros disponibles en el formulario.",
            Self::InvalidScore => {
                "La puntuación debe estar entre 0 y 10 y tener como máximo un decimal."
            }
            Self::InvalidDateRange => "La fecha final no puede ser anterior a la fecha de inicio.",
            Self::InvalidCover => "La portada guardada no es válida.",
        })
    }
}

impl std::error::Error for ReadingError {}

#[cfg(test)]
mod tests {
    use super::*;

    fn draft() -> BookDraft {
        BookDraft {
            title: " Dune ".into(),
            author: " Frank Herbert ".into(),
            genres: vec!["Ciencia ficción".into(), "Ciencia ficción".into()],
            status: ReadingStatus::Reading,
            score: Some(8.5),
            opinion: None,
            favorite: false,
            started_on: NaiveDate::from_ymd_opt(2026, 8, 1),
            finished_on: None,
        }
    }

    #[test]
    fn normalizes_text_and_genres() {
        let draft = draft().validate().unwrap();
        assert_eq!(draft.title, "Dune");
        assert_eq!(draft.author, "Frank Herbert");
        assert_eq!(draft.genres, vec!["Ciencia ficción"]);
    }

    #[test]
    fn rejects_invalid_scores_and_dates() {
        let mut invalid_score = draft();
        invalid_score.score = Some(8.55);
        assert_eq!(
            invalid_score.validate().unwrap_err(),
            ReadingError::InvalidScore
        );
        let mut invalid_dates = draft();
        invalid_dates.finished_on = NaiveDate::from_ymd_opt(2026, 7, 1);
        assert_eq!(
            invalid_dates.validate().unwrap_err(),
            ReadingError::InvalidDateRange
        );
    }
}
