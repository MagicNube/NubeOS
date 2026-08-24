use std::fmt;

use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use super::model::{Game, GameError, GameId, GameRun, GameRunId, GameStatus, ManagedGameCover};

#[derive(Debug)]
pub enum GameRepositoryError {
    Database(rusqlite::Error),
    InvalidStored(GameError),
    InvalidStoredValue(&'static str),
    NotFound,
    RunNotFound,
    MustBeArchived,
    OpenRunExists,
}

impl fmt::Display for GameRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(f, "Error de SQLite: {error}"),
            Self::InvalidStored(error) => write!(f, "Videojuego guardado inválido: {error}"),
            Self::InvalidStoredValue(field) => {
                write!(f, "El valor guardado de {field} no es válido.")
            }
            Self::NotFound => f.write_str("No existe el videojuego solicitado."),
            Self::RunNotFound => f.write_str("No existe la partida solicitada."),
            Self::MustBeArchived => {
                f.write_str("El videojuego debe estar archivado antes de eliminarlo.")
            }
            Self::OpenRunExists => f.write_str("Este videojuego ya tiene una partida en curso."),
        }
    }
}
impl std::error::Error for GameRepositoryError {}
impl From<rusqlite::Error> for GameRepositoryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

pub struct GameRepository<'a> {
    connection: &'a Connection,
}

impl<'a> GameRepository<'a> {
    pub fn new(connection: &'a Connection) -> Self {
        Self { connection }
    }

    pub fn create(&mut self, game: &Game) -> Result<(), GameRepositoryError> {
        self.connection.execute(
            "INSERT INTO games (id, name, normalized_name, game_status, score, opinion,
             is_favorite, is_archived, cover_file_name, cover_mime_type, cover_size_bytes,
             created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9, ?10, ?11, ?11)",
            params![
                game.id.as_str(),
                game.name,
                normalize(&game.name),
                status_to_str(game.status),
                game.score,
                game.opinion,
                game.favorite,
                game.cover.as_ref().map(|c| &c.file_name),
                game.cover.as_ref().map(|c| &c.mime_type),
                game.cover.as_ref().map(|c| c.size_bytes),
                game.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update(&mut self, game: &Game) -> Result<(), GameRepositoryError> {
        let count = self.connection.execute(
            "UPDATE games SET name=?2, normalized_name=?3, game_status=?4, score=?5,
             opinion=?6, is_favorite=?7, cover_file_name=?8, cover_mime_type=?9,
             cover_size_bytes=?10, updated_at=?11 WHERE id=?1",
            params![
                game.id.as_str(),
                game.name,
                normalize(&game.name),
                status_to_str(game.status),
                game.score,
                game.opinion,
                game.favorite,
                game.cover.as_ref().map(|c| &c.file_name),
                game.cover.as_ref().map(|c| &c.mime_type),
                game.cover.as_ref().map(|c| c.size_bytes),
                game.updated_at
            ],
        )?;
        exists(count)
    }

    pub fn find(&mut self, id: &GameId) -> Result<Option<Game>, GameRepositoryError> {
        self.connection
            .query_row(
                "SELECT id,name,game_status,score,opinion,is_favorite,is_archived,updated_at,
             cover_file_name,cover_mime_type,cover_size_bytes FROM games WHERE id=?1",
                [id.as_str()],
                game_from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn list(&mut self, archived: bool) -> Result<Vec<Game>, GameRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,name,game_status,score,opinion,is_favorite,is_archived,updated_at,
             cover_file_name,cover_mime_type,cover_size_bytes FROM games
             WHERE is_archived=?1 ORDER BY updated_at DESC, name COLLATE NOCASE",
        )?;
        let games = statement
            .query_map([archived], game_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(games)
    }

    pub fn set_favorite(&mut self, id: &GameId, value: bool) -> Result<(), GameRepositoryError> {
        self.touch(
            id,
            "UPDATE games SET is_favorite=?2, updated_at=?3 WHERE id=?1",
            value,
        )
    }

    pub fn set_status(
        &mut self,
        id: &GameId,
        value: GameStatus,
    ) -> Result<(), GameRepositoryError> {
        self.touch(
            id,
            "UPDATE games SET game_status=?2, updated_at=?3 WHERE id=?1",
            status_to_str(value),
        )
    }

    pub fn archive(&mut self, id: &GameId, value: bool) -> Result<(), GameRepositoryError> {
        self.touch(
            id,
            "UPDATE games SET is_archived=?2, updated_at=?3 WHERE id=?1",
            value,
        )
    }

    pub fn delete(&mut self, id: &GameId) -> Result<(), GameRepositoryError> {
        let archived = self
            .connection
            .query_row(
                "SELECT is_archived FROM games WHERE id=?1",
                [id.as_str()],
                |row| row.get::<_, bool>(0),
            )
            .optional()?;
        match archived {
            None => Err(GameRepositoryError::NotFound),
            Some(false) => Err(GameRepositoryError::MustBeArchived),
            Some(true) => {
                self.connection
                    .execute("DELETE FROM games WHERE id=?1", [id.as_str()])?;
                Ok(())
            }
        }
    }

    pub fn runs_for(&mut self, game_id: &GameId) -> Result<Vec<GameRun>, GameRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,game_id,started_on,finished_on,created_at,updated_at FROM game_runs
             WHERE game_id=?1 ORDER BY COALESCE(finished_on,started_on) DESC, created_at DESC",
        )?;
        let runs = statement
            .query_map([game_id.as_str()], run_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(runs)
    }

    pub fn all_runs(&mut self) -> Result<Vec<GameRun>, GameRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,game_id,started_on,finished_on,created_at,updated_at FROM game_runs
             ORDER BY COALESCE(finished_on,started_on) DESC, created_at DESC",
        )?;
        let runs = statement
            .query_map([], run_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(runs)
    }

    pub fn find_run(&mut self, id: &GameRunId) -> Result<Option<GameRun>, GameRepositoryError> {
        self.connection.query_row(
            "SELECT id,game_id,started_on,finished_on,created_at,updated_at FROM game_runs WHERE id=?1",
            [id.as_str()], run_from_row,
        ).optional().map_err(Into::into)
    }

    pub fn create_run(&mut self, run: &GameRun) -> Result<(), GameRepositoryError> {
        if run.finished_on.is_none()
            && self.connection.query_row(
                "SELECT EXISTS(SELECT 1 FROM game_runs WHERE game_id=?1 AND finished_on IS NULL)",
                [run.game_id.as_str()],
                |row| row.get::<_, bool>(0),
            )?
        {
            return Err(GameRepositoryError::OpenRunExists);
        }
        let result = self.connection.execute(
            "INSERT INTO game_runs (id,game_id,started_on,finished_on,created_at,updated_at)
             VALUES (?1,?2,?3,?4,?5,?6)",
            params![
                run.id.as_str(),
                run.game_id.as_str(),
                run.started_on.map(|d| d.to_string()),
                run.finished_on.map(|d| d.to_string()),
                run.created_at,
                run.updated_at
            ],
        );
        match result {
            Ok(_) => Ok(()),
            Err(error) if error.to_string().contains("idx_game_runs_one_open") => {
                Err(GameRepositoryError::OpenRunExists)
            }
            Err(error) => Err(error.into()),
        }
    }

    pub fn update_run(&mut self, run: &GameRun) -> Result<(), GameRepositoryError> {
        let count = self.connection.execute(
            "UPDATE game_runs SET started_on=?2,finished_on=?3,updated_at=?4 WHERE id=?1",
            params![
                run.id.as_str(),
                run.started_on.map(|d| d.to_string()),
                run.finished_on.map(|d| d.to_string()),
                run.updated_at
            ],
        )?;
        if count == 0 {
            Err(GameRepositoryError::RunNotFound)
        } else {
            Ok(())
        }
    }

    pub fn delete_run(&mut self, id: &GameRunId) -> Result<GameId, GameRepositoryError> {
        let run = self.find_run(id)?.ok_or(GameRepositoryError::RunNotFound)?;
        self.connection
            .execute("DELETE FROM game_runs WHERE id=?1", [id.as_str()])?;
        Ok(run.game_id)
    }

    pub fn synchronize_status_after_run_change(
        &mut self,
        game_id: &GameId,
    ) -> Result<(), GameRepositoryError> {
        let (open, completed): (i64, i64) = self.connection.query_row(
            "SELECT SUM(CASE WHEN finished_on IS NULL THEN 1 ELSE 0 END),
                    SUM(CASE WHEN finished_on IS NOT NULL THEN 1 ELSE 0 END)
             FROM game_runs WHERE game_id=?1",
            [game_id.as_str()],
            |row| {
                Ok((
                    row.get::<_, Option<i64>>(0)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                ))
            },
        )?;
        let current = self
            .find(game_id)?
            .ok_or(GameRepositoryError::NotFound)?
            .status;
        let status = if open > 0 {
            GameStatus::Playing
        } else if completed > 0 {
            GameStatus::Completed
        } else if matches!(current, GameStatus::Playing | GameStatus::Completed) {
            GameStatus::Pending
        } else {
            current
        };
        self.set_status(game_id, status)
    }

    fn touch<T: rusqlite::ToSql>(
        &mut self,
        id: &GameId,
        sql: &str,
        value: T,
    ) -> Result<(), GameRepositoryError> {
        exists(
            self.connection
                .execute(sql, params![id.as_str(), value, Utc::now().to_rfc3339()])?,
        )
    }
}

fn exists(count: usize) -> Result<(), GameRepositoryError> {
    if count == 0 {
        Err(GameRepositoryError::NotFound)
    } else {
        Ok(())
    }
}

fn game_from_row(row: &Row<'_>) -> rusqlite::Result<Game> {
    let status: String = row.get(2)?;
    Ok(Game {
        id: GameId::parse(&row.get::<_, String>(0)?).map_err(|_| conversion_error(0, "id"))?,
        name: row.get(1)?,
        status: status_from_str(&status).ok_or_else(|| conversion_error(2, "estado"))?,
        score: row.get(3)?,
        opinion: row.get(4)?,
        favorite: row.get(5)?,
        archived: row.get(6)?,
        updated_at: row.get(7)?,
        cover: match (
            row.get::<_, Option<String>>(8)?,
            row.get::<_, Option<String>>(9)?,
            row.get::<_, Option<u64>>(10)?,
        ) {
            (Some(name), Some(mime), Some(size)) => Some(
                ManagedGameCover::new(name, mime, size)
                    .map_err(|_| conversion_error(8, "portada"))?,
            ),
            (None, None, None) => None,
            _ => return Err(conversion_error(8, "portada")),
        },
    })
}

fn run_from_row(row: &Row<'_>) -> rusqlite::Result<GameRun> {
    Ok(GameRun {
        id: GameRunId::parse(&row.get::<_, String>(0)?)
            .map_err(|_| conversion_error(0, "id de partida"))?,
        game_id: GameId::parse(&row.get::<_, String>(1)?)
            .map_err(|_| conversion_error(1, "videojuego"))?,
        started_on: parse_date(row.get(2)?, 2)?,
        finished_on: parse_date(row.get(3)?, 3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn parse_date(value: Option<String>, column: usize) -> rusqlite::Result<Option<NaiveDate>> {
    value
        .map(|value| {
            NaiveDate::parse_from_str(&value, "%Y-%m-%d")
                .map_err(|_| conversion_error(column, "fecha"))
        })
        .transpose()
}
fn conversion_error(column: usize, field: &'static str) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        column,
        rusqlite::types::Type::Text,
        Box::new(GameRepositoryError::InvalidStoredValue(field)),
    )
}
pub fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}
pub fn status_to_str(value: GameStatus) -> &'static str {
    match value {
        GameStatus::Pending => "pending",
        GameStatus::Playing => "playing",
        GameStatus::Paused => "paused",
        GameStatus::Completed => "completed",
        GameStatus::Abandoned => "abandoned",
    }
}
pub fn status_from_str(value: &str) -> Option<GameStatus> {
    Some(match value {
        "pending" => GameStatus::Pending,
        "playing" => GameStatus::Playing,
        "paused" => GameStatus::Paused,
        "completed" => GameStatus::Completed,
        "abandoned" => GameStatus::Abandoned,
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games::model::{GameDraft, GameRun};
    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        connection
            .execute_batch(include_str!("../../migrations/0020_create_games.sql"))
            .unwrap();
        connection
    }
    fn game() -> Game {
        Game::new(
            GameId::generate(),
            GameDraft {
                name: "Celeste".into(),
                status: GameStatus::Pending,
                score: None,
                opinion: None,
                favorite: false,
            },
            Utc::now().to_rfc3339(),
        )
        .unwrap()
    }
    #[test]
    fn persists_runs_and_requires_archive() {
        let connection = database();
        let mut repository = GameRepository::new(&connection);
        let game = game();
        repository.create(&game).unwrap();
        let run = GameRun::new(
            game.id.clone(),
            Some(NaiveDate::from_ymd_opt(2026, 8, 1).unwrap()),
            None,
            Utc::now().to_rfc3339(),
        )
        .unwrap();
        repository.create_run(&run).unwrap();
        assert_eq!(repository.runs_for(&game.id).unwrap().len(), 1);
        assert!(matches!(
            repository.delete(&game.id),
            Err(GameRepositoryError::MustBeArchived)
        ));
    }

    #[test]
    fn only_one_run_can_remain_open() {
        let connection = database();
        let mut repository = GameRepository::new(&connection);
        let game = game();
        repository.create(&game).unwrap();
        let date = NaiveDate::from_ymd_opt(2026, 8, 1);
        repository
            .create_run(
                &GameRun::new(game.id.clone(), date, None, Utc::now().to_rfc3339()).unwrap(),
            )
            .unwrap();
        let second = GameRun::new(
            game.id.clone(),
            NaiveDate::from_ymd_opt(2026, 8, 2),
            None,
            Utc::now().to_rfc3339(),
        )
        .unwrap();
        assert!(matches!(
            repository.create_run(&second),
            Err(GameRepositoryError::OpenRunExists)
        ));
    }

    #[test]
    fn deleting_an_archived_game_cascades_its_runs() {
        let connection = database();
        let mut repository = GameRepository::new(&connection);
        let game = game();
        repository.create(&game).unwrap();
        let run = GameRun::new(
            game.id.clone(),
            NaiveDate::from_ymd_opt(2026, 8, 1),
            NaiveDate::from_ymd_opt(2026, 8, 3),
            Utc::now().to_rfc3339(),
        )
        .unwrap();
        repository.create_run(&run).unwrap();
        repository.archive(&game.id, true).unwrap();
        repository.delete(&game.id).unwrap();
        assert!(repository.find_run(&run.id).unwrap().is_none());
    }
}
