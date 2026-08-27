use std::fmt;

use chrono::NaiveDate;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameId(String);

impl GameId {
    pub fn generate() -> Self {
        Self(Uuid::new_v4().to_string())
    }
    pub fn parse(value: &str) -> Result<Self, GameError> {
        Uuid::parse_str(value).map_err(|_| GameError::InvalidId)?;
        Ok(Self(value.to_owned()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameRunId(String);

impl GameRunId {
    pub fn generate() -> Self {
        Self(Uuid::new_v4().to_string())
    }
    pub fn parse(value: &str) -> Result<Self, GameError> {
        Uuid::parse_str(value).map_err(|_| GameError::InvalidId)?;
        Ok(Self(value.to_owned()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameStatus {
    Pending,
    Playing,
    Paused,
    Completed,
    Abandoned,
}

#[derive(Debug, Clone)]
pub struct GameDraft {
    pub name: String,
    pub status: GameStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManagedGameCover {
    pub file_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

impl ManagedGameCover {
    pub fn new(file_name: String, mime_type: String, size_bytes: u64) -> Result<Self, GameError> {
        if file_name.trim().is_empty()
            || !matches!(
                mime_type.as_str(),
                "image/jpeg" | "image/png" | "image/webp"
            )
            || size_bytes == 0
        {
            return Err(GameError::InvalidCover);
        }
        Ok(Self {
            file_name,
            mime_type,
            size_bytes,
        })
    }
}

#[derive(Debug, Clone)]
pub struct Game {
    pub id: GameId,
    pub name: String,
    pub status: GameStatus,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub cover: Option<ManagedGameCover>,
    pub cover_position_x: f64,
    pub cover_position_y: f64,
    pub cover_zoom: f64,
    pub archived: bool,
    pub updated_at: String,
}

impl GameDraft {
    pub fn validate(mut self) -> Result<Self, GameError> {
        self.name = clean_required(self.name, 180)?;
        self.opinion = clean_optional(self.opinion, 5000)?;
        if self.score.is_some_and(|score| {
            !(0.0..=10.0).contains(&score)
                || ((score * 10.0) - (score * 10.0).round()).abs() > 0.000_001
        }) {
            return Err(GameError::InvalidScore);
        }
        Ok(self)
    }
}

impl Game {
    pub fn new(id: GameId, draft: GameDraft, updated_at: String) -> Result<Self, GameError> {
        let draft = draft.validate()?;
        Ok(Self {
            id,
            name: draft.name,
            status: draft.status,
            score: draft.score,
            opinion: draft.opinion,
            favorite: draft.favorite,
            cover: None,
            cover_position_x: 50.0,
            cover_position_y: 50.0,
            cover_zoom: 1.0,
            archived: false,
            updated_at,
        })
    }
    pub fn apply(&mut self, draft: GameDraft, updated_at: String) -> Result<(), GameError> {
        let draft = draft.validate()?;
        self.name = draft.name;
        self.status = draft.status;
        self.score = draft.score;
        self.opinion = draft.opinion;
        self.favorite = draft.favorite;
        self.updated_at = updated_at;
        Ok(())
    }

    pub fn change_cover_crop(
        &mut self,
        x: f64,
        y: f64,
        zoom: f64,
        updated_at: String,
    ) -> Result<(), GameError> {
        if !x.is_finite()
            || !y.is_finite()
            || !zoom.is_finite()
            || !(0.0..=100.0).contains(&x)
            || !(0.0..=100.0).contains(&y)
            || !(1.0..=2.0).contains(&zoom)
        {
            return Err(GameError::InvalidCoverCrop);
        }
        self.cover_position_x = x;
        self.cover_position_y = y;
        self.cover_zoom = zoom;
        self.updated_at = updated_at;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct GameRun {
    pub id: GameRunId,
    pub game_id: GameId,
    pub started_on: Option<NaiveDate>,
    pub finished_on: Option<NaiveDate>,
    pub created_at: String,
    pub updated_at: String,
}

impl GameRun {
    pub fn new(
        game_id: GameId,
        started_on: Option<NaiveDate>,
        finished_on: Option<NaiveDate>,
        now: String,
    ) -> Result<Self, GameError> {
        validate_dates(started_on, finished_on)?;
        Ok(Self {
            id: GameRunId::generate(),
            game_id,
            started_on,
            finished_on,
            created_at: now.clone(),
            updated_at: now,
        })
    }
    pub fn update(
        &mut self,
        started_on: Option<NaiveDate>,
        finished_on: Option<NaiveDate>,
        now: String,
    ) -> Result<(), GameError> {
        validate_dates(started_on, finished_on)?;
        self.started_on = started_on;
        self.finished_on = finished_on;
        self.updated_at = now;
        Ok(())
    }
}

fn validate_dates(start: Option<NaiveDate>, end: Option<NaiveDate>) -> Result<(), GameError> {
    if start.is_none() {
        return Err(GameError::MissingRunDate);
    }
    if start.zip(end).is_some_and(|(start, end)| start > end) {
        return Err(GameError::InvalidDateRange);
    }
    Ok(())
}

fn clean_required(value: String, limit: usize) -> Result<String, GameError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(GameError::RequiredName);
    }
    if value.chars().count() > limit {
        return Err(GameError::TextTooLong);
    }
    Ok(value)
}

fn clean_optional(value: Option<String>, limit: usize) -> Result<Option<String>, GameError> {
    let value = value
        .map(|text| text.trim().to_owned())
        .filter(|text| !text.is_empty());
    if value
        .as_ref()
        .is_some_and(|text| text.chars().count() > limit)
    {
        return Err(GameError::TextTooLong);
    }
    Ok(value)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GameError {
    InvalidId,
    RequiredName,
    TextTooLong,
    InvalidScore,
    InvalidDateRange,
    MissingRunDate,
    InvalidCover,
    InvalidCoverCrop,
}

impl fmt::Display for GameError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::InvalidId => "El identificador no es válido.",
            Self::RequiredName => "El nombre del videojuego es obligatorio.",
            Self::TextTooLong => "Uno de los textos supera la longitud permitida.",
            Self::InvalidScore => {
                "La puntuación debe estar entre 0 y 10 y tener como máximo un decimal."
            }
            Self::InvalidDateRange => "La fecha final no puede ser anterior a la fecha de inicio.",
            Self::MissingRunDate => "La fecha de inicio de la partida es obligatoria.",
            Self::InvalidCover => "La portada guardada no es válida.",
            Self::InvalidCoverCrop => "El encuadre de la portada no es válido.",
        })
    }
}
impl std::error::Error for GameError {}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_game_and_score() {
        let draft = GameDraft {
            name: " Hollow Knight ".into(),
            status: GameStatus::Playing,
            score: Some(9.5),
            opinion: None,
            favorite: true,
        }
        .validate()
        .unwrap();
        assert_eq!(draft.name, "Hollow Knight");
        let invalid = GameDraft {
            score: Some(9.55),
            ..draft
        };
        assert_eq!(invalid.validate().unwrap_err(), GameError::InvalidScore);
    }
    #[test]
    fn validates_run_dates() {
        let game_id = GameId::generate();
        assert_eq!(
            GameRun::new(game_id.clone(), None, None, "now".into()).unwrap_err(),
            GameError::MissingRunDate
        );
        assert_eq!(
            GameRun::new(
                game_id.clone(),
                None,
                NaiveDate::from_ymd_opt(2026, 8, 2),
                "now".into(),
            )
            .unwrap_err(),
            GameError::MissingRunDate
        );
        let start = NaiveDate::from_ymd_opt(2026, 8, 2);
        let end = NaiveDate::from_ymd_opt(2026, 8, 1);
        assert_eq!(
            GameRun::new(game_id, start, end, "now".into()).unwrap_err(),
            GameError::InvalidDateRange
        );
    }
    #[test]
    fn cover_crop_is_bounded() {
        let draft = GameDraft {
            name: "Celeste".into(),
            status: GameStatus::Playing,
            score: None,
            opinion: None,
            favorite: false,
        };
        let mut game = Game::new(GameId::generate(), draft, "now".into()).unwrap();
        game.change_cover_crop(60.0, 30.0, 1.5, "later".into())
            .unwrap();
        assert_eq!(
            (
                game.cover_position_x,
                game.cover_position_y,
                game.cover_zoom
            ),
            (60.0, 30.0, 1.5)
        );
        assert_eq!(
            game.change_cover_crop(50.0, 101.0, 1.0, "later".into())
                .unwrap_err(),
            GameError::InvalidCoverCrop
        );
    }
}
