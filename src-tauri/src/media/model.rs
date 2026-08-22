//! Entidades e invariantes del seguimiento audiovisual.

use std::fmt;

use chrono::NaiveDate;
use uuid::Uuid;

macro_rules! uuid_id {
    ($name:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Result<Self, MediaError> {
                let value = value.into();
                Uuid::parse_str(&value).map_err(|_| MediaError::InvalidId)?;
                Ok(Self(value))
            }

            pub fn generate() -> Self {
                Self(Uuid::new_v4().to_string())
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }
    };
}

uuid_id!(MediaTitleId);
uuid_id!(MediaContentId);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaKind {
    Anime,
    Series,
    Movie,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaArea {
    Anime,
    Series,
    Movies,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrackingStatus {
    Watching,
    Pending,
    Paused,
    Completed,
    Dropped,
    WaitingContent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContentKind {
    Season,
    Movie,
    Ova,
    Special,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CanonStatus {
    Canon,
    Recommended,
    Optional,
    Omitted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionSource {
    QuickAdd,
    ManualAdjustment,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ManagedCover {
    pub file_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

impl ManagedCover {
    pub fn new(file_name: String, mime_type: String, size_bytes: u64) -> Result<Self, MediaError> {
        if Uuid::parse_str(file_name.split('.').next().unwrap_or_default()).is_err()
            || !matches!(
                mime_type.as_str(),
                "image/jpeg" | "image/png" | "image/webp" | "image/gif"
            )
            || size_bytes == 0
        {
            return Err(MediaError::InvalidCover);
        }
        Ok(Self {
            file_name,
            mime_type,
            size_bytes,
        })
    }
}

#[derive(Debug, Clone)]
pub struct MediaTitle {
    pub id: MediaTitleId,
    pub catalog_number: Option<u32>,
    pub name: String,
    pub alternative_title: Option<String>,
    pub genres: Vec<String>,
    pub kind: MediaKind,
    pub is_anime: bool,
    pub status: TrackingStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub archived: bool,
    pub watched_units: u32,
    pub started_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
    pub current_season: Option<u32>,
    pub current_episode: Option<u32>,
    pub cover: Option<ManagedCover>,
}

#[derive(Debug, Clone)]
pub struct MediaTitleDraft {
    pub name: String,
    pub alternative_title: Option<String>,
    pub genres: Vec<String>,
    pub kind: MediaKind,
    pub is_anime: bool,
    pub status: TrackingStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
    pub current_season: Option<u32>,
    pub current_episode: Option<u32>,
}

impl MediaTitle {
    pub fn new(id: MediaTitleId, draft: MediaTitleDraft) -> Result<Self, MediaError> {
        let draft = draft.validate()?;
        let watched_units =
            u32::from(draft.kind == MediaKind::Movie && draft.status == TrackingStatus::Completed);
        Ok(Self {
            id,
            catalog_number: None,
            name: draft.name,
            alternative_title: draft.alternative_title,
            genres: draft.genres,
            kind: draft.kind,
            is_anime: draft.is_anime,
            status: draft.status,
            score: draft.score,
            opinion: draft.opinion,
            favorite: draft.favorite,
            archived: false,
            watched_units,
            started_on: draft.started_on,
            finished_on: draft.finished_on,
            current_season: draft.current_season,
            current_episode: draft.current_episode,
            cover: None,
        })
    }

    pub fn apply(&mut self, draft: MediaTitleDraft) -> Result<(), MediaError> {
        let draft = draft.validate()?;
        self.name = draft.name;
        self.alternative_title = draft.alternative_title;
        self.genres = draft.genres;
        self.kind = draft.kind;
        self.is_anime = draft.is_anime;
        self.status = draft.status;
        self.score = draft.score;
        self.opinion = draft.opinion;
        self.favorite = draft.favorite;
        self.started_on = draft.started_on;
        self.finished_on = draft.finished_on;
        self.current_season = draft.current_season;
        self.current_episode = draft.current_episode;
        self.watched_units =
            u32::from(self.kind == MediaKind::Movie && self.status == TrackingStatus::Completed);
        if self.kind != MediaKind::Series {
            self.current_season = None;
            self.current_episode = None;
        }
        Ok(())
    }

    pub fn belongs_to(&self, area: MediaArea) -> bool {
        match area {
            MediaArea::Anime => self.is_anime,
            MediaArea::Series => self.kind == MediaKind::Series && !self.is_anime,
            MediaArea::Movies => self.kind == MediaKind::Movie && !self.is_anime,
        }
    }

    pub fn assign_catalog_number(&mut self, number: u32) -> Result<(), MediaError> {
        if !self.is_anime || self.kind != MediaKind::Anime || number == 0 {
            return Err(MediaError::InvalidCatalogNumber);
        }
        self.catalog_number = Some(number);
        Ok(())
    }

    pub fn clear_catalog_number(&mut self) {
        self.catalog_number = None;
    }

    pub fn change_status(&mut self, status: TrackingStatus) {
        self.status = status;
    }

    pub fn change_score(&mut self, score: Option<f64>) -> Result<(), MediaError> {
        validate_score(score)?;
        self.score = score;
        Ok(())
    }

    pub fn change_favorite(&mut self, favorite: bool) {
        self.favorite = favorite;
    }
}

impl MediaTitleDraft {
    pub fn validate(mut self) -> Result<Self, MediaError> {
        self.name = clean_required(self.name, 150)?;
        self.alternative_title = clean_optional(self.alternative_title, 150)?;
        self.genres = clean_genres(self.genres)?;
        self.opinion = clean_optional(self.opinion, 4000)?;
        validate_score(self.score)?;
        if (self.kind == MediaKind::Anime && !self.is_anime)
            || (self.kind == MediaKind::Series && self.is_anime)
        {
            return Err(MediaError::InvalidMediaArea);
        }
        if self.kind != MediaKind::Series
            && (self.current_season.is_some() || self.current_episode.is_some())
        {
            return Err(MediaError::InvalidSeriesProgress);
        }
        if self.current_season == Some(0) || self.current_episode == Some(0) {
            return Err(MediaError::InvalidSeriesProgress);
        }
        if self
            .started_on
            .zip(self.finished_on)
            .is_some_and(|(start, end)| start > end)
        {
            return Err(MediaError::InvalidDateRange);
        }
        Ok(self)
    }
}

#[derive(Debug, Clone)]
pub struct MediaContent {
    pub id: MediaContentId,
    pub title_id: MediaTitleId,
    pub name: String,
    pub kind: ContentKind,
    pub status: TrackingStatus,
    pub canon_status: CanonStatus,
    pub total_episodes: Option<u32>,
    pub watched_episodes: u32,
    pub studio: Option<String>,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub notes: Option<String>,
    pub started_on: Option<NaiveDate>,
    pub released_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
    pub position: u32,
}

#[derive(Debug, Clone)]
pub struct MediaContentDraft {
    pub name: String,
    pub kind: ContentKind,
    pub status: TrackingStatus,
    pub canon_status: CanonStatus,
    pub total_episodes: Option<u32>,
    pub watched_episodes: u32,
    pub studio: Option<String>,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub notes: Option<String>,
    pub started_on: Option<NaiveDate>,
    pub released_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
}

impl MediaContent {
    pub fn new(
        id: MediaContentId,
        title_id: MediaTitleId,
        draft: MediaContentDraft,
        position: u32,
    ) -> Result<Self, MediaError> {
        let draft = draft.validate()?;
        Ok(Self {
            id,
            title_id,
            name: draft.name,
            kind: draft.kind,
            status: draft.status,
            canon_status: draft.canon_status,
            total_episodes: draft.total_episodes,
            watched_episodes: draft.watched_episodes,
            studio: draft.studio,
            score: draft.score,
            opinion: draft.opinion,
            notes: draft.notes,
            started_on: draft.started_on,
            released_on: draft.released_on,
            finished_on: draft.finished_on,
            position,
        })
    }

    pub fn apply(&mut self, draft: MediaContentDraft) -> Result<(), MediaError> {
        let draft = draft.validate()?;
        self.name = draft.name;
        self.kind = draft.kind;
        self.status = draft.status;
        self.canon_status = draft.canon_status;
        self.total_episodes = draft.total_episodes;
        self.watched_episodes = draft.watched_episodes;
        self.studio = draft.studio;
        self.score = draft.score;
        self.opinion = draft.opinion;
        self.notes = draft.notes;
        self.started_on = draft.started_on;
        self.released_on = draft.released_on;
        self.finished_on = draft.finished_on;
        Ok(())
    }

    pub fn effective_total(&self) -> Option<u32> {
        self.total_episodes
            .or_else(|| (self.kind != ContentKind::Season).then_some(1))
    }
}

impl MediaContentDraft {
    pub fn validate(mut self) -> Result<Self, MediaError> {
        self.name = clean_required(self.name, 150)?;
        self.studio = clean_optional(self.studio, 150)?;
        self.opinion = clean_optional(self.opinion, 4000)?;
        self.notes = clean_optional(self.notes, 4000)?;
        validate_score(self.score)?;
        if self.total_episodes == Some(0) {
            return Err(MediaError::InvalidEpisodeTotal);
        }
        let effective_total = self
            .total_episodes
            .or_else(|| (self.kind != ContentKind::Season).then_some(1));
        if effective_total.is_some_and(|total| self.watched_episodes > total) {
            return Err(MediaError::ProgressExceedsTotal);
        }
        if self
            .released_on
            .zip(self.finished_on)
            .is_some_and(|(start, end)| start > end)
        {
            return Err(MediaError::InvalidDateRange);
        }
        if self
            .started_on
            .zip(self.finished_on)
            .is_some_and(|(start, end)| start > end)
        {
            return Err(MediaError::InvalidDateRange);
        }
        Ok(self)
    }
}

#[derive(Debug, Clone)]
pub struct WatchSession {
    pub id: String,
    pub title_id: Option<MediaTitleId>,
    pub content_id: Option<MediaContentId>,
    pub watched_on: NaiveDate,
    pub delta: i32,
    pub episode_number: Option<u32>,
    pub source: SessionSource,
}

fn clean_required(value: String, limit: usize) -> Result<String, MediaError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(MediaError::EmptyName);
    }
    if value.chars().count() > limit {
        return Err(MediaError::TextTooLong);
    }
    Ok(value)
}

fn clean_optional(value: Option<String>, limit: usize) -> Result<Option<String>, MediaError> {
    let value = value
        .map(|text| text.trim().to_owned())
        .filter(|text| !text.is_empty());
    if value
        .as_ref()
        .is_some_and(|text| text.chars().count() > limit)
    {
        return Err(MediaError::TextTooLong);
    }
    Ok(value)
}

fn clean_genres(values: Vec<String>) -> Result<Vec<String>, MediaError> {
    let mut genres = Vec::new();
    for value in values {
        let value = clean_required(value, 50)?;
        if !genres.iter().any(|stored| stored == &value) {
            genres.push(value);
        }
    }
    if genres.len() > 20 {
        return Err(MediaError::TooManyGenres);
    }
    Ok(genres)
}

fn validate_score(score: Option<f64>) -> Result<(), MediaError> {
    if score.is_some_and(|value| {
        !(0.0..=10.0).contains(&value) || (value * 10.0 - (value * 10.0).round()).abs() > 0.000_001
    }) {
        return Err(MediaError::InvalidScore);
    }
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MediaError {
    InvalidId,
    InvalidCatalogNumber,
    EmptyName,
    TextTooLong,
    TooManyGenres,
    InvalidScore,
    InvalidEpisodeTotal,
    ProgressExceedsTotal,
    InvalidDateRange,
    InvalidMediaArea,
    InvalidSeriesProgress,
    TitleCannotHaveContents,
    InvalidCover,
    CannotIncrement,
    FutureSession,
}

impl fmt::Display for MediaError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidId => "El identificador no es válido.",
            Self::InvalidCatalogNumber => "El número de catálogo no es válido.",
            Self::EmptyName => "El nombre no puede estar vacío.",
            Self::TextTooLong => "Uno de los textos supera la longitud permitida.",
            Self::TooManyGenres => "Un título no puede tener más de 20 géneros.",
            Self::InvalidScore => {
                "La puntuación debe estar entre 0 y 10 y tener como máximo un decimal."
            }
            Self::InvalidEpisodeTotal => "El total de episodios debe ser mayor que cero.",
            Self::ProgressExceedsTotal => "Los episodios vistos no pueden superar el total.",
            Self::InvalidDateRange => "La fecha final no puede ser anterior a la de estreno.",
            Self::InvalidMediaArea => "El tipo de título no pertenece a esta biblioteca.",
            Self::InvalidSeriesProgress => {
                "La temporada y el episodio actuales solo son válidos para series."
            }
            Self::TitleCannotHaveContents => {
                "Solo un anime de tipo serie o franquicia admite contenidos."
            }
            Self::InvalidCover => "La portada administrada no es válida.",
            Self::CannotIncrement => "Este contenido no puede avanzar otro episodio.",
            Self::FutureSession => "No se puede registrar una sesión futura.",
        })
    }
}

impl std::error::Error for MediaError {}

#[cfg(test)]
mod tests {
    use super::*;

    fn content(kind: ContentKind, total: Option<u32>, watched: u32) -> MediaContentDraft {
        MediaContentDraft {
            name: "Contenido".into(),
            kind,
            status: TrackingStatus::Watching,
            canon_status: CanonStatus::Canon,
            total_episodes: total,
            watched_episodes: watched,
            studio: None,
            score: None,
            opinion: None,
            notes: None,
            started_on: None,
            released_on: None,
            finished_on: None,
        }
    }

    #[test]
    fn scores_use_tenth_point_steps() {
        let mut draft = content(ContentKind::Season, Some(12), 0);
        draft.score = Some(8.5);
        assert!(draft.clone().validate().is_ok());
        draft.score = Some(8.3);
        assert!(draft.clone().validate().is_ok());
        draft.score = Some(8.35);
        assert_eq!(draft.validate().unwrap_err(), MediaError::InvalidScore);
        let mut zero = content(ContentKind::Season, Some(12), 0);
        zero.score = Some(0.0);
        assert!(zero.validate().is_ok());
    }

    #[test]
    fn unknown_season_and_single_unit_extras_are_distinct() {
        let season = MediaContent::new(
            MediaContentId::generate(),
            MediaTitleId::generate(),
            content(ContentKind::Season, None, 7),
            0,
        )
        .unwrap();
        let ova = MediaContent::new(
            MediaContentId::generate(),
            MediaTitleId::generate(),
            content(ContentKind::Ova, None, 1),
            0,
        )
        .unwrap();
        assert_eq!(season.effective_total(), None);
        assert_eq!(ova.effective_total(), Some(1));
    }

    #[test]
    fn progress_cannot_exceed_a_known_total() {
        assert_eq!(
            content(ContentKind::Season, Some(12), 13)
                .validate()
                .unwrap_err(),
            MediaError::ProgressExceedsTotal
        );
    }

    #[test]
    fn audiovisual_area_and_simple_series_progress_are_validated() {
        let base = MediaTitleDraft {
            name: "Título".into(),
            alternative_title: None,
            genres: vec!["Drama".into()],
            kind: MediaKind::Series,
            is_anime: false,
            status: TrackingStatus::Watching,
            score: None,
            opinion: None,
            favorite: false,
            started_on: None,
            finished_on: None,
            current_season: Some(2),
            current_episode: Some(5),
        };
        assert!(base.clone().validate().is_ok());
        assert_eq!(
            MediaTitleDraft {
                kind: MediaKind::Movie,
                current_season: Some(1),
                ..base.clone()
            }
            .validate()
            .unwrap_err(),
            MediaError::InvalidSeriesProgress
        );
        assert_eq!(
            MediaTitleDraft {
                kind: MediaKind::Anime,
                is_anime: false,
                current_season: None,
                current_episode: None,
                ..base
            }
            .validate()
            .unwrap_err(),
            MediaError::InvalidMediaArea
        );
    }

    #[test]
    fn a_completed_movie_starts_as_watched() {
        let mut title = MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Your Name".into(),
                alternative_title: None,
                genres: vec!["Romance".into()],
                kind: MediaKind::Movie,
                is_anime: true,
                status: TrackingStatus::Completed,
                score: Some(9.0),
                opinion: None,
                favorite: true,
                started_on: None,
                finished_on: NaiveDate::from_ymd_opt(2026, 8, 16),
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap();
        assert_eq!(title.watched_units, 1);
        assert!(title.is_anime);
        assert!(title.belongs_to(MediaArea::Anime));
        assert!(!title.belongs_to(MediaArea::Movies));
        assert_eq!(
            title.assign_catalog_number(1).unwrap_err(),
            MediaError::InvalidCatalogNumber
        );
    }
}
