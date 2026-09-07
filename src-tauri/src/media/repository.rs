//! Persistencia SQLite del seguimiento audiovisual.

use std::fmt;

use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::{
    model::{
        CanonStatus, ContentKind, ManagedCover, MediaContent, MediaContentId, MediaError,
        MediaKind, MediaTitle, MediaTitleId, MovieViewing, MovieViewingId, SeriesRun, SeriesRunId,
        SessionSource, TrackingStatus, WatchSession,
    },
    service::MediaAggregate,
};

#[derive(Debug)]
pub enum MediaRepositoryError {
    Database(rusqlite::Error),
    InvalidStored(MediaError),
    InvalidStoredValue(&'static str),
    NotFound,
    MustBeArchived,
    InvalidOrder,
    SessionCannotBeRemoved,
    SessionCannotBeEdited,
    ViewingBeforeFirst,
    InvalidRunDates,
    InvalidContentRun(&'static str),
}

impl fmt::Display for MediaRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidContentRun(message) => formatter.write_str(message),
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::InvalidStored(error) => {
                write!(formatter, "Datos audiovisuales inválidos: {error}")
            }
            Self::InvalidStoredValue(field) => {
                write!(formatter, "El valor guardado de {field} no es válido.")
            }
            Self::NotFound => formatter.write_str("No existe el título o contenido solicitado."),
            Self::MustBeArchived => {
                formatter.write_str("El título debe estar archivado antes de eliminarlo.")
            }
            Self::InvalidOrder => formatter
                .write_str("El nuevo orden no contiene exactamente los contenidos del título."),
            Self::SessionCannotBeRemoved => formatter
                .write_str("Solo puede retirarse el último episodio registrado de cada contenido."),
            Self::SessionCannotBeEdited => formatter.write_str(
                "Solo se puede cambiar la cantidad del último bloque registrado de cada contenido.",
            ),
            Self::ViewingBeforeFirst => formatter.write_str(
                "Un nuevo visionado no puede ser anterior al primer visionado registrado.",
            ),
            Self::InvalidRunDates => {
                formatter.write_str("La fecha final no puede ser anterior a la fecha de inicio.")
            }
        }
    }
}

impl std::error::Error for MediaRepositoryError {}

impl From<rusqlite::Error> for MediaRepositoryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

pub struct MediaRepository<'connection> {
    connection: &'connection mut Connection,
}

type StoredSessionTarget = (Option<String>, Option<String>, Option<u32>, bool);

struct NewWatchSession<'a> {
    title_id: Option<&'a MediaTitleId>,
    content_id: Option<&'a MediaContentId>,
    watched_on: NaiveDate,
    episode_number: u32,
    source: SessionSource,
    registration_id: &'a str,
    is_rewatch: bool,
    run_id: Option<&'a str>,
}

#[derive(Debug, Clone)]
pub struct MediaHistoryEntry {
    pub id: String,
    pub title_id: MediaTitleId,
    pub title_name: String,
    pub title_kind: MediaKind,
    pub is_anime: bool,
    pub content_id: Option<MediaContentId>,
    pub content_name: Option<String>,
    pub content_kind: Option<ContentKind>,
    pub watched_on: NaiveDate,
    pub episode_number: u32,
    pub can_delete: bool,
    pub released_on: Option<NaiveDate>,
}

impl<'connection> MediaRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn create_title(&mut self, title: &MediaTitle) -> Result<(), MediaRepositoryError> {
        let now = Utc::now().to_rfc3339();
        let normalized_name = normalize(&title.name);
        let normalized_alternative = title.alternative_title.as_deref().map(normalize);
        let cover_name = title.cover.as_ref().map(|cover| cover.file_name.as_str());
        let cover_mime = title.cover.as_ref().map(|cover| cover.mime_type.as_str());
        let cover_size = title.cover.as_ref().map(|cover| cover.size_bytes);
        let started_on = title.started_on.map(|date| date.to_string());
        let finished_on = title.finished_on.map(|date| date.to_string());
        let genres_json = genres_to_json(&title.genres);
        self.connection.execute(
            "INSERT INTO media_titles
             (id, name, normalized_name, alternative_title, normalized_alternative_title,
              kind, tracking_status, score, opinion, is_favorite, is_archived, watched_units,
              cover_file_name, cover_mime_type, cover_size_bytes, is_anime, started_on,
              finished_on, current_season, current_episode, catalog_number, genres_json,
              primary_studio, cover_position_x, cover_position_y, cover_zoom, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                     ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?27)",
            params![
                title.id.as_str(),
                title.name,
                normalized_name,
                title.alternative_title,
                normalized_alternative,
                media_kind_to_str(title.kind),
                tracking_status_to_str(title.status),
                title.score,
                title.opinion,
                title.favorite,
                title.archived,
                title.watched_units,
                cover_name,
                cover_mime,
                cover_size,
                title.is_anime,
                started_on,
                finished_on,
                title.current_season,
                title.current_episode,
                title.catalog_number,
                genres_json,
                title.primary_studio,
                title.cover_position_x,
                title.cover_position_y,
                title.cover_zoom,
                now,
            ],
        )?;
        Ok(())
    }

    pub fn update_title(&mut self, title: &MediaTitle) -> Result<(), MediaRepositoryError> {
        let now = Utc::now().to_rfc3339();
        let normalized_name = normalize(&title.name);
        let normalized_alternative = title.alternative_title.as_deref().map(normalize);
        let cover_name = title.cover.as_ref().map(|cover| cover.file_name.as_str());
        let cover_mime = title.cover.as_ref().map(|cover| cover.mime_type.as_str());
        let cover_size = title.cover.as_ref().map(|cover| cover.size_bytes);
        let started_on = title.started_on.map(|date| date.to_string());
        let finished_on = title.finished_on.map(|date| date.to_string());
        let genres_json = genres_to_json(&title.genres);
        let affected = self.connection.execute(
            "UPDATE media_titles SET
                 name = ?2, normalized_name = ?3, alternative_title = ?4,
                 normalized_alternative_title = ?5, kind = ?6, tracking_status = ?7,
                 score = ?8, opinion = ?9, is_favorite = ?10, is_archived = ?11,
                 watched_units = ?12, cover_file_name = ?13, cover_mime_type = ?14,
                 cover_size_bytes = ?15, is_anime = ?16, started_on = ?17,
                 finished_on = ?18, current_season = ?19, current_episode = ?20,
                 catalog_number = ?21, genres_json = ?22, primary_studio = ?23,
                 cover_position_x = ?24, cover_position_y = ?25, cover_zoom = ?26,
                 updated_at = ?27
             WHERE id = ?1",
            params![
                title.id.as_str(),
                title.name,
                normalized_name,
                title.alternative_title,
                normalized_alternative,
                media_kind_to_str(title.kind),
                tracking_status_to_str(title.status),
                title.score,
                title.opinion,
                title.favorite,
                title.archived,
                title.watched_units,
                cover_name,
                cover_mime,
                cover_size,
                title.is_anime,
                started_on,
                finished_on,
                title.current_season,
                title.current_episode,
                title.catalog_number,
                genres_json,
                title.primary_studio,
                title.cover_position_x,
                title.cover_position_y,
                title.cover_zoom,
                now,
            ],
        )?;
        if affected == 0 {
            return Err(MediaRepositoryError::NotFound);
        }
        Ok(())
    }

    pub fn find_title(
        &mut self,
        id: &MediaTitleId,
    ) -> Result<Option<MediaTitle>, MediaRepositoryError> {
        self.connection
            .query_row(
                "SELECT id, name, alternative_title, kind, tracking_status, score, opinion,
                        is_favorite, is_archived, watched_units, cover_file_name,
                        cover_mime_type, cover_size_bytes, is_anime, started_on, finished_on,
                        current_season, current_episode, catalog_number, genres_json, primary_studio,
                        cover_position_x, cover_position_y, cover_zoom
                 FROM media_titles WHERE id = ?1",
                [id.as_str()],
                title_from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn list_aggregates(&mut self) -> Result<Vec<MediaAggregate>, MediaRepositoryError> {
        let titles = {
            let mut statement = self.connection.prepare(
                "SELECT id, name, alternative_title, kind, tracking_status, score, opinion,
                        is_favorite, is_archived, watched_units, cover_file_name,
                        cover_mime_type, cover_size_bytes, is_anime, started_on, finished_on,
                        current_season, current_episode, catalog_number, genres_json, primary_studio,
                        cover_position_x, cover_position_y, cover_zoom
                 FROM media_titles ORDER BY updated_at DESC, name COLLATE NOCASE",
            )?;
            let rows = statement
                .query_map([], title_from_row)?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };
        titles
            .into_iter()
            .map(|title| self.aggregate_for_title(title))
            .collect()
    }

    pub fn next_anime_catalog_number(&mut self) -> Result<u32, MediaRepositoryError> {
        let transaction = self.connection.transaction()?;
        let current: u32 = transaction.query_row(
            "SELECT last_value FROM media_catalog_sequences WHERE area = 'anime'",
            [],
            |row| row.get(0),
        )?;
        let next = current
            .checked_add(1)
            .ok_or(MediaRepositoryError::InvalidStoredValue(
                "número de catálogo",
            ))?;
        transaction.execute(
            "UPDATE media_catalog_sequences SET last_value = ?1 WHERE area = 'anime'",
            [next],
        )?;
        transaction.commit()?;
        Ok(next)
    }

    pub fn find_aggregate(
        &mut self,
        id: &MediaTitleId,
    ) -> Result<Option<MediaAggregate>, MediaRepositoryError> {
        self.find_title(id)?
            .map(|title| self.aggregate_for_title(title))
            .transpose()
    }

    pub fn list_studios(&mut self) -> Result<Vec<String>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT studio FROM (
                 SELECT trim(primary_studio) AS studio FROM media_titles
                 WHERE primary_studio IS NOT NULL AND trim(primary_studio) != ''
                 UNION
                 SELECT trim(studio) AS studio FROM media_contents
                 WHERE studio IS NOT NULL AND trim(studio) != ''
             ) ORDER BY studio COLLATE NOCASE",
        )?;
        let studios = statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(studios)
    }

    pub fn list_history(&mut self) -> Result<Vec<MediaHistoryEntry>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id, title_id, title_name, title_kind, is_anime, content_id,
                    content_name, content_kind, watched_on, episode_number, can_delete, released_on
             FROM (
                 SELECT sessions.id AS id, titles.id AS title_id, titles.name AS title_name,
                        titles.kind AS title_kind, titles.is_anime AS is_anime,
                        contents.id AS content_id, contents.name AS content_name,
                        contents.kind AS content_kind, sessions.watched_on AS watched_on,
                        sessions.episode_number AS episode_number,
                        CASE
                          WHEN sessions.is_rewatch = 1 THEN 1
                          WHEN contents.id IS NOT NULL THEN contents.watched_episodes = sessions.episode_number
                          ELSE titles.watched_units = sessions.episode_number
                        END AS can_delete,
                        sessions.created_at AS created_at, contents.released_on AS released_on
                 FROM media_watch_sessions sessions
                 JOIN media_titles titles
                   ON titles.id = sessions.title_id
                   OR titles.id = (SELECT title_id FROM media_contents WHERE id = sessions.content_id)
                 LEFT JOIN media_contents contents ON contents.id = sessions.content_id
                 WHERE sessions.episode_number IS NOT NULL
                 UNION ALL
                 SELECT viewings.id, titles.id, titles.name, titles.kind, titles.is_anime,
                        NULL, NULL, NULL, viewings.watched_on, 1, 1, viewings.created_at, NULL
                 FROM media_movie_viewings viewings
                 JOIN media_titles titles ON titles.id = viewings.title_id
                 WHERE titles.is_anime = 1 AND titles.kind = 'movie'
             )
             ORDER BY watched_on DESC, created_at DESC",
        )?;
        let entries = statement
            .query_map([], |row| {
                Ok(MediaHistoryEntry {
                    id: row.get(0)?,
                    title_id: MediaTitleId::new(row.get::<_, String>(1)?)
                        .map_err(|error| conversion_error(error.to_string()))?,
                    title_name: row.get(2)?,
                    title_kind: media_kind_from_str(&row.get::<_, String>(3)?)?,
                    is_anime: row.get(4)?,
                    content_id: row
                        .get::<_, Option<String>>(5)?
                        .map(MediaContentId::new)
                        .transpose()
                        .map_err(|error| conversion_error(error.to_string()))?,
                    content_name: row.get(6)?,
                    content_kind: row
                        .get::<_, Option<String>>(7)?
                        .map(|value| content_kind_from_str(&value))
                        .transpose()?,
                    watched_on: parse_date(&row.get::<_, String>(8)?)?,
                    episode_number: row.get(9)?,
                    can_delete: row.get(10)?,
                    released_on: row
                        .get::<_, Option<String>>(11)?
                        .map(|date| parse_date(&date))
                        .transpose()?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn create_content(&mut self, content: &MediaContent) -> Result<(), MediaRepositoryError> {
        let now = Utc::now().to_rfc3339();
        let released_on = content.released_on.map(|date| date.to_string());
        let finished_on = content.finished_on.map(|date| date.to_string());
        let started_on = content.started_on.map(|date| date.to_string());
        self.connection.execute(
            "INSERT INTO media_contents
             (id, title_id, name, kind, tracking_status, canon_status, total_episodes,
              watched_episodes, studio, score, opinion, released_on, finished_on, position,
              started_on, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                     ?15, ?16, ?17, ?17)",
            params![
                content.id.as_str(),
                content.title_id.as_str(),
                content.name,
                content_kind_to_str(content.kind),
                tracking_status_to_str(content.status),
                canon_status_to_str(content.canon_status),
                content.total_episodes,
                content.watched_episodes,
                content.studio,
                content.score,
                content.opinion,
                released_on,
                finished_on,
                content.position,
                started_on,
                content.notes,
                now,
            ],
        )?;
        self.touch_title(&content.title_id)?;
        Ok(())
    }

    pub fn next_content_position(
        &mut self,
        title_id: &MediaTitleId,
    ) -> Result<u32, MediaRepositoryError> {
        self.connection
            .query_row(
                "SELECT COALESCE(MAX(position) + 1, 0) FROM media_contents WHERE title_id = ?1",
                [title_id.as_str()],
                |row| row.get(0),
            )
            .map_err(Into::into)
    }

    pub fn find_content(
        &mut self,
        id: &MediaContentId,
    ) -> Result<Option<MediaContent>, MediaRepositoryError> {
        self.connection
            .query_row(
                "SELECT id, title_id, name, kind, tracking_status, canon_status, total_episodes,
                        watched_episodes, studio, score, opinion, released_on, finished_on, position
                        , started_on, notes
                 FROM media_contents WHERE id = ?1",
                [id.as_str()],
                content_from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn update_content(&mut self, content: &MediaContent) -> Result<(), MediaRepositoryError> {
        let now = Utc::now().to_rfc3339();
        let released_on = content.released_on.map(|date| date.to_string());
        let finished_on = content.finished_on.map(|date| date.to_string());
        let started_on = content.started_on.map(|date| date.to_string());
        let affected = self.connection.execute(
            "UPDATE media_contents SET
                 name = ?3, kind = ?4, tracking_status = ?5, canon_status = ?6,
                 total_episodes = ?7, watched_episodes = ?8, studio = ?9, score = ?10,
                 opinion = ?11, released_on = ?12, finished_on = ?13, position = ?14,
                 started_on = ?15, notes = ?16, updated_at = ?17
             WHERE id = ?1 AND title_id = ?2",
            params![
                content.id.as_str(),
                content.title_id.as_str(),
                content.name,
                content_kind_to_str(content.kind),
                tracking_status_to_str(content.status),
                canon_status_to_str(content.canon_status),
                content.total_episodes,
                content.watched_episodes,
                content.studio,
                content.score,
                content.opinion,
                released_on,
                finished_on,
                content.position,
                started_on,
                content.notes,
                now,
            ],
        )?;
        if affected == 0 {
            return Err(MediaRepositoryError::NotFound);
        }
        self.touch_title(&content.title_id)?;
        Ok(())
    }

    pub fn delete_content(&mut self, id: &MediaContentId) -> Result<(), MediaRepositoryError> {
        let content = self
            .find_content(id)?
            .ok_or(MediaRepositoryError::NotFound)?;
        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM media_contents WHERE id = ?1", [id.as_str()])?;
        normalize_positions(&transaction, &content.title_id)?;
        transaction.commit()?;
        self.touch_title(&content.title_id)?;
        Ok(())
    }

    pub fn reorder_contents(
        &mut self,
        title_id: &MediaTitleId,
        ids: &[MediaContentId],
    ) -> Result<(), MediaRepositoryError> {
        let stored: Vec<String> = {
            let mut statement = self
                .connection
                .prepare("SELECT id FROM media_contents WHERE title_id = ?1 ORDER BY position")?;
            let rows = statement
                .query_map([title_id.as_str()], |row| row.get(0))?
                .collect::<Result<_, _>>()?;
            rows
        };
        let mut expected = stored.clone();
        let mut received: Vec<_> = ids.iter().map(|id| id.as_str().to_owned()).collect();
        expected.sort();
        received.sort();
        if expected != received {
            return Err(MediaRepositoryError::InvalidOrder);
        }
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "UPDATE media_contents SET position = position + 100000 WHERE title_id = ?1",
            [title_id.as_str()],
        )?;
        for (position, id) in ids.iter().enumerate() {
            transaction.execute(
                "UPDATE media_contents SET position = ?1 WHERE id = ?2 AND title_id = ?3",
                params![position as u32, id.as_str(), title_id.as_str()],
            )?;
        }
        transaction.commit()?;
        self.touch_title(title_id)?;
        Ok(())
    }

    pub fn set_title_progress(
        &mut self,
        title_id: &MediaTitleId,
        next: u32,
        watched_on: NaiveDate,
        source: SessionSource,
    ) -> Result<(), MediaRepositoryError> {
        let transaction = self.connection.transaction()?;
        let current: u32 = transaction
            .query_row(
                "SELECT watched_units FROM media_titles WHERE id = ?1",
                [title_id.as_str()],
                |row| row.get(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        transaction.execute(
            "UPDATE media_titles SET
                 watched_units = ?1,
                 tracking_status = CASE WHEN ?1 = 1 THEN 'completed' ELSE 'pending' END,
                 finished_on = CASE WHEN ?1 = 1 THEN ?2 ELSE NULL END,
                 updated_at = ?3
             WHERE id = ?4",
            params![
                next,
                watched_on.to_string(),
                Utc::now().to_rfc3339(),
                title_id.as_str()
            ],
        )?;
        if next > current {
            let registration_id = uuid::Uuid::new_v4().to_string();
            for episode_number in (current + 1)..=next {
                insert_session(
                    &transaction,
                    NewWatchSession {
                        title_id: Some(title_id),
                        content_id: None,
                        watched_on,
                        episode_number,
                        source,
                        registration_id: &registration_id,
                        is_rewatch: false,
                        run_id: None,
                    },
                )?;
            }
        } else if next < current {
            transaction.execute(
                "DELETE FROM media_watch_sessions
                 WHERE title_id = ?1 AND is_rewatch = 0
                   AND episode_number IS NOT NULL AND episode_number > ?2",
                params![title_id.as_str(), next],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn set_content_progress(
        &mut self,
        content_id: &MediaContentId,
        next: u32,
        watched_on: NaiveDate,
        source: SessionSource,
    ) -> Result<(), MediaRepositoryError> {
        let transaction = self.connection.transaction()?;
        let (current, title_id): (u32, String) = transaction
            .query_row(
                "SELECT watched_episodes, title_id FROM media_contents WHERE id = ?1",
                [content_id.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        let now = Utc::now().to_rfc3339();
        transaction.execute(
            "UPDATE media_contents SET watched_episodes = ?1, updated_at = ?2 WHERE id = ?3",
            params![next, now, content_id.as_str()],
        )?;
        transaction.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), title_id],
        )?;
        if next > current {
            // Adding primary progress explicitly resumes that same run, not a new rewatch.
            transaction.execute(
                "UPDATE media_content_runs SET status = 'inProgress' WHERE id = ?1",
                [format!("{}:base", content_id.as_str())],
            )?;
            let registration_id = uuid::Uuid::new_v4().to_string();
            for episode_number in (current + 1)..=next {
                insert_session(
                    &transaction,
                    NewWatchSession {
                        title_id: None,
                        content_id: Some(content_id),
                        watched_on,
                        episode_number,
                        source,
                        registration_id: &registration_id,
                        is_rewatch: false,
                        run_id: None,
                    },
                )?;
            }
        } else if next < current {
            transaction.execute(
                "DELETE FROM media_watch_sessions
                 WHERE content_id = ?1 AND is_rewatch = 0
                   AND episode_number IS NOT NULL AND episode_number > ?2",
                params![content_id.as_str(), next],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn register_content_rewatch(
        &mut self,
        content_id: &MediaContentId,
        episodes: u32,
        watched_on: NaiveDate,
    ) -> Result<(), MediaRepositoryError> {
        let transaction = self.connection.transaction()?;
        let title_id: String = transaction
            .query_row(
                "SELECT title_id FROM media_contents WHERE id = ?1",
                [content_id.as_str()],
                |row| row.get(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        let registration_id = uuid::Uuid::new_v4().to_string();
        for episode_number in 1..=episodes {
            insert_session(
                &transaction,
                NewWatchSession {
                    title_id: None,
                    content_id: Some(content_id),
                    watched_on,
                    episode_number,
                    source: SessionSource::ManualAdjustment,
                    registration_id: &registration_id,
                    is_rewatch: true,
                    run_id: None,
                },
            )?;
        }
        transaction.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), title_id],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn register_content_run_range(
        &mut self,
        content_id: &MediaContentId,
        run_id: Option<&str>,
        first: u32,
        last: u32,
        watched_on: NaiveDate,
        status: &str,
    ) -> Result<(), MediaRepositoryError> {
        let content = self
            .find_content(content_id)?
            .ok_or(MediaRepositoryError::NotFound)?;
        if first == 0
            || first > last
            || !matches!(status, "inProgress" | "completed" | "interrupted")
        {
            return Err(MediaRepositoryError::InvalidContentRun(
                "El intervalo o estado del recorrido no es válido.",
            ));
        }
        if content.canon_status == CanonStatus::Omitted
            || content.status == TrackingStatus::WaitingContent
        {
            return Err(MediaRepositoryError::InvalidContentRun(
                "Este contenido está omitido o por salir.",
            ));
        }
        super::service::validate_progress_change(
            0,
            last,
            content.effective_total(),
            watched_on,
            Utc::now()
                .with_timezone(&chrono_tz::Europe::Madrid)
                .date_naive(),
            content.released_on,
        )
        .map_err(MediaRepositoryError::InvalidStored)?;
        let transaction = self.connection.transaction()?;
        let run = if let Some(id) = run_id {
            let stored: Option<(String, String, bool)> = transaction.query_row(
                "SELECT content_id, status, EXISTS(SELECT 1 FROM media_watch_sessions WHERE run_id = r.id AND is_rewatch = 0) FROM media_content_runs r WHERE id = ?1",
                [id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))).optional()?;
            let (owner, stored_status, is_base) = stored.ok_or(MediaRepositoryError::NotFound)?;
            if owner != content_id.as_str() || is_base {
                return Err(MediaRepositoryError::InvalidContentRun(
                    "El recorrido no es un revisionado de este contenido.",
                ));
            }
            if stored_status != "inProgress" {
                return Err(MediaRepositoryError::InvalidContentRun(
                    "Retoma el recorrido antes de añadir episodios.",
                ));
            }
            id.to_owned()
        } else {
            let id = uuid::Uuid::new_v4().to_string();
            transaction.execute(
                "INSERT INTO media_content_runs(id, content_id) VALUES (?1, ?2)",
                params![id, content_id.as_str()],
            )?;
            id
        };
        let overlaps: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM media_watch_sessions WHERE run_id = ?1 AND episode_number BETWEEN ?2 AND ?3)",
            params![run, first, last], |row| row.get(0))?;
        if overlaps {
            return Err(MediaRepositoryError::InvalidContentRun("Ya hay episodios de ese intervalo en este recorrido. Para volver a verlos, crea otro recorrido."));
        }
        let registration = uuid::Uuid::new_v4().to_string();
        for episode_number in first..=last {
            insert_session(
                &transaction,
                NewWatchSession {
                    title_id: None,
                    content_id: Some(content_id),
                    watched_on,
                    episode_number,
                    source: SessionSource::ManualAdjustment,
                    registration_id: &registration,
                    is_rewatch: true,
                    run_id: Some(&run),
                },
            )?;
        }
        validate_run_completion(&transaction, &run, content.effective_total(), status)?;
        transaction.execute(
            "UPDATE media_content_runs SET status = ?1 WHERE id = ?2",
            params![status, run],
        )?;
        transaction.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), content.title_id.as_str()],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn set_content_run_status(
        &mut self,
        content_id: &MediaContentId,
        run_id: &str,
        status: &str,
    ) -> Result<(), MediaRepositoryError> {
        if !matches!(status, "inProgress" | "completed" | "interrupted") {
            return Err(MediaRepositoryError::InvalidContentRun(
                "Estado de recorrido no válido.",
            ));
        }
        let content = self
            .find_content(content_id)?
            .ok_or(MediaRepositoryError::NotFound)?;
        let transaction = self.connection.transaction()?;
        let belongs: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM media_content_runs WHERE id = ?1 AND content_id = ?2)",
            params![run_id, content_id.as_str()],
            |r| r.get(0),
        )?;
        if !belongs {
            return Err(MediaRepositoryError::NotFound);
        }
        validate_run_completion(&transaction, run_id, content.effective_total(), status)?;
        transaction.execute(
            "UPDATE media_content_runs SET status = ?1 WHERE id = ?2",
            params![status, run_id],
        )?;
        transaction.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), content.title_id.as_str()],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn update_session_date(
        &mut self,
        session_id: &str,
        watched_on: NaiveDate,
    ) -> Result<(), MediaRepositoryError> {
        let affected = self.connection.execute(
            "UPDATE media_watch_sessions SET watched_on = ?1
             WHERE id = ?2 AND episode_number IS NOT NULL",
            params![watched_on.to_string(), session_id],
        )?;
        if affected == 0 {
            return Err(MediaRepositoryError::NotFound);
        }
        Ok(())
    }

    pub fn update_content_registration(
        &mut self,
        registration_id: &str,
        expected_content_id: &MediaContentId,
        watched_on: NaiveDate,
        episodes: u32,
    ) -> Result<(), MediaRepositoryError> {
        self.update_content_registration_range(
            registration_id,
            expected_content_id,
            watched_on,
            episodes,
            None,
        )
    }

    pub fn update_content_registration_range(
        &mut self,
        registration_id: &str,
        expected_content_id: &MediaContentId,
        watched_on: NaiveDate,
        episodes: u32,
        requested_first: Option<u32>,
    ) -> Result<(), MediaRepositoryError> {
        let transaction = self.connection.transaction()?;
        let stored: Option<(String, String, bool, u32, u32, String)> = transaction
            .query_row(
                "SELECT sessions.content_id, contents.title_id, sessions.is_rewatch,
                        MIN(sessions.episode_number), COUNT(*), sessions.source
                 FROM media_watch_sessions sessions
                 JOIN media_contents contents ON contents.id = sessions.content_id
                 WHERE sessions.registration_id = ?1 AND sessions.content_id = ?2
                   AND sessions.episode_number IS NOT NULL
                 GROUP BY sessions.registration_id, sessions.content_id, contents.title_id,
                          sessions.is_rewatch, sessions.source",
                params![registration_id, expected_content_id.as_str()],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .optional()?;
        let (content_id, title_id, is_rewatch, first_episode, current_count, source) =
            stored.ok_or(MediaRepositoryError::NotFound)?;
        let (current_progress, kind, total): (u32, String, Option<u32>) = transaction.query_row(
            "SELECT watched_episodes, kind, total_episodes FROM media_contents WHERE id = ?1",
            [&content_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;
        let effective_total = total.or_else(|| (kind != "season").then_some(1));
        let first = requested_first.unwrap_or(first_episode);
        let end = first.checked_add(episodes.saturating_sub(1));
        if episodes == 0
            || first == 0
            || end.is_none()
            || effective_total.is_some_and(|limit| end.unwrap_or(u32::MAX) > limit)
            || (!is_rewatch && first != first_episode)
        {
            return Err(MediaRepositoryError::InvalidStoredValue(
                "cantidad de episodios",
            ));
        }
        let last_episode = first_episode + current_count - 1;
        if !is_rewatch && episodes != current_count && last_episode != current_progress {
            return Err(MediaRepositoryError::SessionCannotBeEdited);
        }
        let run_id: Option<String> = transaction.query_row(
            "SELECT run_id FROM media_watch_sessions WHERE registration_id = ?1 LIMIT 1",
            [registration_id],
            |row| row.get(0),
        )?;
        if let Some(run) = &run_id {
            let overlaps: bool = transaction.query_row(
                "SELECT EXISTS(SELECT 1 FROM media_watch_sessions WHERE run_id = ?1 AND registration_id != ?2 AND episode_number BETWEEN ?3 AND ?4)",
                params![run, registration_id, first, end], |row| row.get(0))?;
            if overlaps {
                return Err(MediaRepositoryError::InvalidContentRun(
                    "Ese intervalo se solapa con otro registro del recorrido.",
                ));
            }
        }
        transaction.execute(
            "DELETE FROM media_watch_sessions WHERE registration_id = ?1",
            [registration_id],
        )?;
        let content_id =
            MediaContentId::new(content_id).map_err(MediaRepositoryError::InvalidStored)?;
        let source = session_source_from_str(&source)?;
        for episode_number in first..=end.unwrap() {
            insert_session(
                &transaction,
                NewWatchSession {
                    title_id: None,
                    content_id: Some(&content_id),
                    watched_on,
                    episode_number,
                    source,
                    registration_id,
                    is_rewatch,
                    run_id: run_id.as_deref(),
                },
            )?;
        }
        if !is_rewatch && episodes != current_count {
            transaction.execute(
                "UPDATE media_contents SET watched_episodes = ?1, updated_at = ?2 WHERE id = ?3",
                params![
                    first_episode + episodes - 1,
                    Utc::now().to_rfc3339(),
                    content_id.as_str()
                ],
            )?;
        }
        transaction.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), title_id],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn session_content_release(
        &mut self,
        session_id: &str,
    ) -> Result<Option<NaiveDate>, MediaRepositoryError> {
        let stored: Option<Option<String>> = self
            .connection
            .query_row(
                "SELECT contents.released_on
                 FROM media_watch_sessions sessions
                 LEFT JOIN media_contents contents ON contents.id = sessions.content_id
                 WHERE sessions.id = ?1",
                [session_id],
                |row| row.get(0),
            )
            .optional()?;
        stored
            .ok_or(MediaRepositoryError::NotFound)?
            .map(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| MediaRepositoryError::InvalidStoredValue("estreno del contenido"))
    }

    pub fn delete_latest_session(&mut self, session_id: &str) -> Result<(), MediaRepositoryError> {
        let target: Option<StoredSessionTarget> = self
            .connection
            .query_row(
                "SELECT title_id, content_id, episode_number, is_rewatch
                 FROM media_watch_sessions WHERE id = ?1",
                [session_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .optional()?;
        let (title_id, content_id, episode_number, is_rewatch) =
            target.ok_or(MediaRepositoryError::NotFound)?;
        let episode_number = episode_number.ok_or(MediaRepositoryError::SessionCannotBeRemoved)?;
        let transaction = self.connection.transaction()?;
        if is_rewatch {
            let parent_id: String = transaction.query_row(
                "SELECT title_id FROM media_contents WHERE id = ?1",
                [content_id
                    .as_deref()
                    .ok_or(MediaRepositoryError::NotFound)?],
                |row| row.get(0),
            )?;
            transaction.execute(
                "DELETE FROM media_watch_sessions WHERE id = ?1",
                [session_id],
            )?;
            transaction.execute(
                "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
                params![Utc::now().to_rfc3339(), parent_id],
            )?;
            transaction.commit()?;
            return Ok(());
        }
        if let Some(content_id) = content_id {
            let (current, parent_id): (u32, String) = transaction.query_row(
                "SELECT watched_episodes, title_id FROM media_contents WHERE id = ?1",
                [&content_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            if current != episode_number {
                return Err(MediaRepositoryError::SessionCannotBeRemoved);
            }
            transaction.execute(
                "UPDATE media_contents SET watched_episodes = ?1, updated_at = ?2 WHERE id = ?3",
                params![current - 1, Utc::now().to_rfc3339(), content_id],
            )?;
            transaction.execute(
                "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
                params![Utc::now().to_rfc3339(), parent_id],
            )?;
        } else if let Some(title_id) = title_id {
            let current: u32 = transaction.query_row(
                "SELECT watched_units FROM media_titles WHERE id = ?1",
                [&title_id],
                |row| row.get(0),
            )?;
            if current != episode_number {
                return Err(MediaRepositoryError::SessionCannotBeRemoved);
            }
            transaction.execute(
                "UPDATE media_titles SET watched_units = 0, tracking_status = 'pending',
                        finished_on = NULL, updated_at = ?1 WHERE id = ?2",
                params![Utc::now().to_rfc3339(), title_id],
            )?;
        }
        transaction.execute(
            "DELETE FROM media_watch_sessions WHERE id = ?1",
            [session_id],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn archive_title(&mut self, id: &MediaTitleId) -> Result<(), MediaRepositoryError> {
        self.set_archived(id, true)
    }

    pub fn restore_title(&mut self, id: &MediaTitleId) -> Result<(), MediaRepositoryError> {
        self.set_archived(id, false)
    }

    pub fn delete_archived_title(
        &mut self,
        id: &MediaTitleId,
    ) -> Result<Option<ManagedCover>, MediaRepositoryError> {
        let title = self.find_title(id)?.ok_or(MediaRepositoryError::NotFound)?;
        if !title.archived {
            return Err(MediaRepositoryError::MustBeArchived);
        }
        self.connection
            .execute("DELETE FROM media_titles WHERE id = ?1", [id.as_str()])?;
        Ok(title.cover)
    }

    pub fn movie_viewings(
        &mut self,
        title_id: &MediaTitleId,
    ) -> Result<Vec<MovieViewing>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,title_id,watched_on,created_at,updated_at FROM media_movie_viewings WHERE title_id=?1 ORDER BY watched_on DESC,created_at DESC")?;
        let viewings = statement
            .query_map([title_id.as_str()], movie_viewing_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(viewings)
    }

    pub fn all_movie_viewings(&mut self) -> Result<Vec<MovieViewing>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,title_id,watched_on,created_at,updated_at FROM media_movie_viewings ORDER BY watched_on DESC,created_at DESC")?;
        let viewings = statement
            .query_map([], movie_viewing_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(viewings)
    }

    pub fn create_movie_viewing(
        &mut self,
        viewing: &MovieViewing,
    ) -> Result<(), MediaRepositoryError> {
        let first: Option<String> = self.connection.query_row(
            "SELECT MIN(watched_on) FROM media_movie_viewings WHERE title_id=?1",
            [viewing.title_id.as_str()],
            |row| row.get(0),
        )?;
        if first.is_some_and(|date| viewing.watched_on.to_string() < date) {
            return Err(MediaRepositoryError::ViewingBeforeFirst);
        }
        self.connection.execute("INSERT INTO media_movie_viewings(id,title_id,watched_on,created_at,updated_at) VALUES(?1,?2,?3,?4,?5)",
            params![viewing.id.as_str(), viewing.title_id.as_str(), viewing.watched_on.to_string(), viewing.created_at, viewing.updated_at])?;
        self.sync_movie_from_viewings(&viewing.title_id)
    }

    pub fn update_movie_viewing(
        &mut self,
        id: &MovieViewingId,
        watched_on: NaiveDate,
    ) -> Result<MediaTitleId, MediaRepositoryError> {
        let title_id = self
            .connection
            .query_row(
                "SELECT title_id FROM media_movie_viewings WHERE id=?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        let first: Option<(String, String)> = self
            .connection
            .query_row(
                "SELECT id,watched_on FROM media_movie_viewings WHERE title_id=?1 ORDER BY watched_on,created_at LIMIT 1",
                [&title_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;
        if first.is_some_and(|(first_id, date)| {
            first_id != id.as_str() && watched_on.to_string() < date
        }) {
            return Err(MediaRepositoryError::ViewingBeforeFirst);
        }
        self.connection.execute(
            "UPDATE media_movie_viewings SET watched_on=?2,updated_at=?3 WHERE id=?1",
            params![id.as_str(), watched_on.to_string(), Utc::now().to_rfc3339()],
        )?;
        let title_id = MediaTitleId::new(title_id).map_err(MediaRepositoryError::InvalidStored)?;
        self.sync_movie_from_viewings(&title_id)?;
        Ok(title_id)
    }

    pub fn delete_movie_viewing(
        &mut self,
        id: &MovieViewingId,
    ) -> Result<MediaTitleId, MediaRepositoryError> {
        let title_id = self
            .connection
            .query_row(
                "SELECT title_id FROM media_movie_viewings WHERE id=?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        self.connection.execute(
            "DELETE FROM media_movie_viewings WHERE id=?1",
            [id.as_str()],
        )?;
        let title_id = MediaTitleId::new(title_id).map_err(MediaRepositoryError::InvalidStored)?;
        self.sync_movie_from_viewings(&title_id)?;
        Ok(title_id)
    }

    fn sync_movie_from_viewings(
        &mut self,
        title_id: &MediaTitleId,
    ) -> Result<(), MediaRepositoryError> {
        let latest: Option<String> = self.connection.query_row(
            "SELECT MAX(watched_on) FROM media_movie_viewings WHERE title_id=?1",
            [title_id.as_str()],
            |row| row.get(0),
        )?;
        self.connection.execute("UPDATE media_titles SET watched_units=?2,tracking_status=?3,finished_on=?4,updated_at=?5 WHERE id=?1",
            params![title_id.as_str(), u32::from(latest.is_some()), if latest.is_some() { "completed" } else { "pending" }, latest, Utc::now().to_rfc3339()])?;
        Ok(())
    }

    pub fn series_runs(
        &mut self,
        title_id: &MediaTitleId,
    ) -> Result<Vec<SeriesRun>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,title_id,started_on,finished_on,created_at,updated_at FROM media_series_runs WHERE title_id=?1 ORDER BY COALESCE(finished_on,started_on) DESC,created_at DESC")?;
        let runs = statement
            .query_map([title_id.as_str()], series_run_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(runs)
    }

    pub fn all_series_runs(&mut self) -> Result<Vec<SeriesRun>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id,title_id,started_on,finished_on,created_at,updated_at FROM media_series_runs ORDER BY COALESCE(finished_on,started_on) DESC,created_at DESC")?;
        let runs = statement
            .query_map([], series_run_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(runs)
    }

    pub fn create_series_run(&mut self, run: &SeriesRun) -> Result<(), MediaRepositoryError> {
        validate_run_dates(run.started_on, run.finished_on)?;
        self.connection.execute(
            "INSERT INTO media_series_runs(id,title_id,started_on,finished_on,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6)",
            params![run.id.as_str(), run.title_id.as_str(), run.started_on.to_string(), run.finished_on.map(|date| date.to_string()), run.created_at, run.updated_at],
        )?;
        self.sync_series_from_runs(&run.title_id)
    }

    pub fn update_series_run(
        &mut self,
        id: &SeriesRunId,
        started_on: NaiveDate,
        finished_on: Option<NaiveDate>,
    ) -> Result<MediaTitleId, MediaRepositoryError> {
        validate_run_dates(started_on, finished_on)?;
        let title_id = self
            .connection
            .query_row(
                "SELECT title_id FROM media_series_runs WHERE id=?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        self.connection.execute(
            "UPDATE media_series_runs SET started_on=?2,finished_on=?3,updated_at=?4 WHERE id=?1",
            params![
                id.as_str(),
                started_on.to_string(),
                finished_on.map(|date| date.to_string()),
                Utc::now().to_rfc3339()
            ],
        )?;
        let title_id = MediaTitleId::new(title_id).map_err(MediaRepositoryError::InvalidStored)?;
        self.sync_series_from_runs(&title_id)?;
        Ok(title_id)
    }

    pub fn delete_series_run(
        &mut self,
        id: &SeriesRunId,
    ) -> Result<MediaTitleId, MediaRepositoryError> {
        let title_id = self
            .connection
            .query_row(
                "SELECT title_id FROM media_series_runs WHERE id=?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or(MediaRepositoryError::NotFound)?;
        self.connection
            .execute("DELETE FROM media_series_runs WHERE id=?1", [id.as_str()])?;
        let title_id = MediaTitleId::new(title_id).map_err(MediaRepositoryError::InvalidStored)?;
        self.sync_series_from_runs(&title_id)?;
        Ok(title_id)
    }

    fn sync_series_from_runs(
        &mut self,
        title_id: &MediaTitleId,
    ) -> Result<(), MediaRepositoryError> {
        let dates: (Option<String>, Option<String>, i64) = self.connection.query_row(
            "SELECT MIN(started_on),MAX(finished_on),COUNT(*) FROM media_series_runs WHERE title_id=?1",
            [title_id.as_str()],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;
        let has_open: bool = self.connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM media_series_runs WHERE title_id=?1 AND finished_on IS NULL)",
            [title_id.as_str()],
            |row| row.get(0),
        )?;
        let status = if has_open {
            "watching"
        } else if dates.2 > 0 {
            "completed"
        } else {
            "pending"
        };
        self.connection.execute(
            "UPDATE media_titles SET started_on=?2,finished_on=?3,tracking_status=?4,updated_at=?5 WHERE id=?1",
            params![title_id.as_str(), dates.0, if has_open { None::<String> } else { dates.1 }, status, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    fn set_archived(
        &mut self,
        id: &MediaTitleId,
        archived: bool,
    ) -> Result<(), MediaRepositoryError> {
        let affected = self.connection.execute(
            "UPDATE media_titles SET is_archived = ?1, updated_at = ?2 WHERE id = ?3",
            params![archived, Utc::now().to_rfc3339(), id.as_str()],
        )?;
        if affected == 0 {
            return Err(MediaRepositoryError::NotFound);
        }
        Ok(())
    }

    fn aggregate_for_title(
        &mut self,
        title: MediaTitle,
    ) -> Result<MediaAggregate, MediaRepositoryError> {
        let contents = self.contents_for_title(&title.id)?;
        let sessions = self.sessions_for_title(&title.id)?;
        Ok(MediaAggregate {
            title,
            contents,
            sessions,
        })
    }

    fn contents_for_title(
        &mut self,
        id: &MediaTitleId,
    ) -> Result<Vec<MediaContent>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id, title_id, name, kind, tracking_status, canon_status, total_episodes,
                    watched_episodes, studio, score, opinion, released_on, finished_on, position
                    , started_on, notes
             FROM media_contents WHERE title_id = ?1 ORDER BY position",
        )?;
        let rows = statement
            .query_map([id.as_str()], content_from_row)?
            .collect::<Result<_, _>>()
            .map_err(Into::into);
        rows
    }

    fn sessions_for_title(
        &mut self,
        id: &MediaTitleId,
    ) -> Result<Vec<WatchSession>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT sessions.id, sessions.title_id, sessions.content_id, sessions.watched_on,
                    sessions.delta, sessions.source, sessions.episode_number,
                    sessions.registration_id, sessions.is_rewatch, sessions.run_id, COALESCE(runs.status, 'inProgress')
             FROM media_watch_sessions sessions
             LEFT JOIN media_contents contents ON contents.id = sessions.content_id
             LEFT JOIN media_content_runs runs ON runs.id = sessions.run_id
             WHERE (sessions.title_id = ?1 OR contents.title_id = ?1)
               AND sessions.episode_number IS NOT NULL
             ORDER BY sessions.watched_on DESC, sessions.created_at DESC",
        )?;
        let rows = statement
            .query_map([id.as_str()], session_from_row)?
            .collect::<Result<_, _>>()
            .map_err(Into::into);
        rows
    }

    fn touch_title(&mut self, id: &MediaTitleId) -> Result<(), MediaRepositoryError> {
        self.connection.execute(
            "UPDATE media_titles SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id.as_str()],
        )?;
        Ok(())
    }
}

fn validate_run_completion(
    transaction: &Transaction<'_>,
    run_id: &str,
    total: Option<u32>,
    status: &str,
) -> Result<(), MediaRepositoryError> {
    if status == "completed" {
        let (count, first, last): (u32, Option<u32>, Option<u32>) = transaction.query_row(
            "SELECT COUNT(DISTINCT episode_number), MIN(episode_number), MAX(episode_number) FROM media_watch_sessions WHERE run_id = ?1",
            [run_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?;
        if count == 0 || total.is_some_and(|n| count != n || first != Some(1) || last != Some(n)) {
            return Err(MediaRepositoryError::InvalidContentRun(
                "Faltan episodios para terminar el recorrido. Puedes dejarlo Interrumpido.",
            ));
        }
    }
    Ok(())
}

fn insert_session(
    transaction: &Transaction<'_>,
    session: NewWatchSession<'_>,
) -> Result<(), rusqlite::Error> {
    let run_id = session.content_id.map(|content| {
        session.run_id.map(str::to_owned).unwrap_or_else(|| {
            if session.is_rewatch {
                format!("{}:run:{}", content.as_str(), session.registration_id)
            } else {
                format!("{}:base", content.as_str())
            }
        })
    });
    if let (Some(id), Some(content)) = (&run_id, session.content_id) {
        transaction.execute(
            "INSERT OR IGNORE INTO media_content_runs(id, content_id) VALUES (?1, ?2)",
            params![id, content.as_str()],
        )?;
    }
    transaction.execute(
        "INSERT INTO media_watch_sessions
         (id, title_id, content_id, watched_on, delta, source, created_at, episode_number,
          registration_id, is_rewatch, run_id)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            uuid::Uuid::new_v4().to_string(),
            session.title_id.map(MediaTitleId::as_str),
            session.content_id.map(MediaContentId::as_str),
            session.watched_on.to_string(),
            session_source_to_str(session.source),
            Utc::now().to_rfc3339(),
            session.episode_number,
            session.registration_id,
            session.is_rewatch,
            run_id,
        ],
    )?;
    Ok(())
}

fn movie_viewing_from_row(row: &Row<'_>) -> rusqlite::Result<MovieViewing> {
    Ok(MovieViewing {
        id: MovieViewingId::new(row.get::<_, String>(0)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        title_id: MediaTitleId::new(row.get::<_, String>(1)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        watched_on: NaiveDate::parse_from_str(&row.get::<_, String>(2)?, "%Y-%m-%d")
            .map_err(|_| conversion_error("Fecha de visionado inválida"))?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn series_run_from_row(row: &Row<'_>) -> rusqlite::Result<SeriesRun> {
    Ok(SeriesRun {
        id: SeriesRunId::new(row.get::<_, String>(0)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        title_id: MediaTitleId::new(row.get::<_, String>(1)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        started_on: NaiveDate::parse_from_str(&row.get::<_, String>(2)?, "%Y-%m-%d")
            .map_err(|_| conversion_error("Fecha inicial de serie inválida"))?,
        finished_on: row
            .get::<_, Option<String>>(3)?
            .map(|date| {
                NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                    .map_err(|_| conversion_error("Fecha final de serie inválida"))
            })
            .transpose()?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn validate_run_dates(
    started_on: NaiveDate,
    finished_on: Option<NaiveDate>,
) -> Result<(), MediaRepositoryError> {
    if finished_on.is_some_and(|date| date < started_on) {
        return Err(MediaRepositoryError::InvalidRunDates);
    }
    Ok(())
}

fn normalize_positions(
    transaction: &Transaction<'_>,
    title_id: &MediaTitleId,
) -> Result<(), rusqlite::Error> {
    let ids: Vec<String> = {
        let mut statement = transaction
            .prepare("SELECT id FROM media_contents WHERE title_id = ?1 ORDER BY position")?;
        let rows = statement
            .query_map([title_id.as_str()], |row| row.get(0))?
            .collect::<Result<_, _>>()?;
        rows
    };
    transaction.execute(
        "UPDATE media_contents SET position = position + 100000 WHERE title_id = ?1",
        [title_id.as_str()],
    )?;
    for (position, id) in ids.iter().enumerate() {
        transaction.execute(
            "UPDATE media_contents SET position = ?1 WHERE id = ?2",
            params![position as u32, id],
        )?;
    }
    Ok(())
}

fn title_from_row(row: &Row<'_>) -> rusqlite::Result<MediaTitle> {
    let cover_name: Option<String> = row.get(10)?;
    let cover_mime: Option<String> = row.get(11)?;
    let cover_size: Option<u64> = row.get(12)?;
    let cover = match (cover_name, cover_mime, cover_size) {
        (Some(name), Some(mime), Some(size)) => Some(
            ManagedCover::new(name, mime, size)
                .map_err(|error| conversion_error(error.to_string()))?,
        ),
        (None, None, None) => None,
        _ => return Err(conversion_error("Metadatos de portada incompletos")),
    };
    Ok(MediaTitle {
        id: MediaTitleId::new(row.get::<_, String>(0)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        name: row.get(1)?,
        alternative_title: row.get(2)?,
        kind: media_kind_from_str(&row.get::<_, String>(3)?)?,
        is_anime: row.get(13)?,
        status: tracking_status_from_str(&row.get::<_, String>(4)?)?,
        score: row.get(5)?,
        opinion: row.get(6)?,
        favorite: row.get(7)?,
        archived: row.get(8)?,
        watched_units: row.get(9)?,
        started_on: parse_optional_date(row.get(14)?)?,
        finished_on: parse_optional_date(row.get(15)?)?,
        current_season: row.get(16)?,
        current_episode: row.get(17)?,
        catalog_number: row.get(18)?,
        genres: genres_from_json(&row.get::<_, String>(19)?)?,
        primary_studio: row.get(20)?,
        cover_position_x: row.get(21)?,
        cover_position_y: row.get(22)?,
        cover_zoom: row.get(23)?,
        cover,
    })
}

fn content_from_row(row: &Row<'_>) -> rusqlite::Result<MediaContent> {
    Ok(MediaContent {
        id: MediaContentId::new(row.get::<_, String>(0)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        title_id: MediaTitleId::new(row.get::<_, String>(1)?)
            .map_err(|error| conversion_error(error.to_string()))?,
        name: row.get(2)?,
        kind: content_kind_from_str(&row.get::<_, String>(3)?)?,
        status: tracking_status_from_str(&row.get::<_, String>(4)?)?,
        canon_status: canon_status_from_str(&row.get::<_, String>(5)?)?,
        total_episodes: row.get(6)?,
        watched_episodes: row.get(7)?,
        studio: row.get(8)?,
        score: row.get(9)?,
        opinion: row.get(10)?,
        released_on: parse_optional_date(row.get(11)?)?,
        finished_on: parse_optional_date(row.get(12)?)?,
        position: row.get(13)?,
        started_on: parse_optional_date(row.get(14)?)?,
        notes: row.get(15)?,
    })
}

fn genres_to_json(genres: &[String]) -> String {
    serde_json::to_string(genres).expect("serializar una lista de textos no puede fallar")
}

fn genres_from_json(value: &str) -> rusqlite::Result<Vec<String>> {
    serde_json::from_str(value).map_err(|_| conversion_error("Géneros guardados no válidos"))
}

fn session_from_row(row: &Row<'_>) -> rusqlite::Result<WatchSession> {
    Ok(WatchSession {
        id: row.get(0)?,
        title_id: row
            .get::<_, Option<String>>(1)?
            .map(MediaTitleId::new)
            .transpose()
            .map_err(|error| conversion_error(error.to_string()))?,
        content_id: row
            .get::<_, Option<String>>(2)?
            .map(MediaContentId::new)
            .transpose()
            .map_err(|error| conversion_error(error.to_string()))?,
        watched_on: parse_date(&row.get::<_, String>(3)?)?,
        delta: row.get(4)?,
        source: session_source_from_str(&row.get::<_, String>(5)?)?,
        registration_id: row.get(7)?,
        is_rewatch: row.get(8)?,
        run_id: row.get(9)?,
        run_status: row.get(10)?,
        episode_number: row.get(6)?,
    })
}

fn parse_optional_date(value: Option<String>) -> rusqlite::Result<Option<NaiveDate>> {
    value.map(|value| parse_date(&value)).transpose()
}

fn parse_date(value: &str) -> rusqlite::Result<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| conversion_error("Fecha guardada no válida"))
}

fn conversion_error(message: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            message.into(),
        )),
    )
}

pub(crate) fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

pub(crate) fn media_kind_to_str(value: MediaKind) -> &'static str {
    match value {
        MediaKind::Anime => "anime",
        MediaKind::Series => "series",
        MediaKind::Movie => "movie",
    }
}

pub(crate) fn media_kind_from_str(value: &str) -> rusqlite::Result<MediaKind> {
    match value {
        "anime" => Ok(MediaKind::Anime),
        "series" => Ok(MediaKind::Series),
        "movie" => Ok(MediaKind::Movie),
        _ => Err(conversion_error("Tipo de título desconocido")),
    }
}

pub(crate) fn tracking_status_to_str(value: TrackingStatus) -> &'static str {
    match value {
        TrackingStatus::Watching => "watching",
        TrackingStatus::Pending => "pending",
        TrackingStatus::Paused => "paused",
        TrackingStatus::Completed => "completed",
        TrackingStatus::Dropped => "dropped",
        TrackingStatus::WaitingContent => "waiting_content",
        TrackingStatus::ToResume => "to_resume",
    }
}

pub(crate) fn tracking_status_from_str(value: &str) -> rusqlite::Result<TrackingStatus> {
    match value {
        "watching" => Ok(TrackingStatus::Watching),
        "pending" => Ok(TrackingStatus::Pending),
        "paused" => Ok(TrackingStatus::Paused),
        "completed" => Ok(TrackingStatus::Completed),
        "dropped" => Ok(TrackingStatus::Dropped),
        "waiting_content" => Ok(TrackingStatus::WaitingContent),
        "to_resume" => Ok(TrackingStatus::ToResume),
        _ => Err(conversion_error("Estado de seguimiento desconocido")),
    }
}

pub(crate) fn content_kind_to_str(value: ContentKind) -> &'static str {
    match value {
        ContentKind::Season => "season",
        ContentKind::Movie => "movie",
        ContentKind::Ova => "ova",
        ContentKind::Special => "special",
    }
}

pub(crate) fn content_kind_from_str(value: &str) -> rusqlite::Result<ContentKind> {
    match value {
        "season" => Ok(ContentKind::Season),
        "movie" => Ok(ContentKind::Movie),
        "ova" => Ok(ContentKind::Ova),
        "special" => Ok(ContentKind::Special),
        _ => Err(conversion_error("Tipo de contenido desconocido")),
    }
}

pub(crate) fn canon_status_to_str(value: CanonStatus) -> &'static str {
    match value {
        CanonStatus::Canon => "canon",
        CanonStatus::Recommended => "recommended",
        CanonStatus::Optional => "optional",
        CanonStatus::Omitted => "omitted",
    }
}

pub(crate) fn canon_status_from_str(value: &str) -> rusqlite::Result<CanonStatus> {
    match value {
        "canon" => Ok(CanonStatus::Canon),
        "recommended" => Ok(CanonStatus::Recommended),
        "optional" => Ok(CanonStatus::Optional),
        "omitted" => Ok(CanonStatus::Omitted),
        _ => Err(conversion_error("Canonicidad desconocida")),
    }
}

pub(crate) fn session_source_to_str(value: SessionSource) -> &'static str {
    match value {
        SessionSource::QuickAdd => "quick_add",
        SessionSource::ManualAdjustment => "manual_adjustment",
    }
}

pub(crate) fn session_source_from_str(value: &str) -> rusqlite::Result<SessionSource> {
    match value {
        "quick_add" => Ok(SessionSource::QuickAdd),
        "manual_adjustment" => Ok(SessionSource::ManualAdjustment),
        _ => Err(conversion_error("Origen de sesión desconocido")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        meals::repository::apply_migrations,
        media::model::{MediaContentDraft, MediaTitleDraft},
    };

    fn title() -> MediaTitle {
        MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Boku no Hero Academia".into(),
                alternative_title: Some("My Hero Academia".into()),
                genres: vec!["Acción".into()],
                primary_studio: Some("Bones".into()),
                kind: MediaKind::Anime,
                is_anime: true,
                status: TrackingStatus::Watching,
                score: Some(8.0),
                opinion: None,
                favorite: true,
                started_on: None,
                finished_on: None,
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap()
    }

    fn content(title_id: MediaTitleId, name: &str, position: u32) -> MediaContent {
        MediaContent::new(
            MediaContentId::generate(),
            title_id,
            MediaContentDraft {
                name: name.into(),
                kind: ContentKind::Season,
                status: TrackingStatus::Watching,
                canon_status: CanonStatus::Canon,
                total_episodes: Some(12),
                watched_episodes: 0,
                studio: None,
                score: None,
                opinion: None,
                notes: None,
                started_on: None,
                released_on: None,
                finished_on: None,
            },
            position,
        )
        .unwrap()
    }

    #[test]
    fn to_resume_migration_preserves_existing_anime_and_content() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        // Restore only the pre-0036 constraint to exercise a populated upgrade.
        connection.execute_batch("DROP INDEX idx_media_watch_sessions_run_episode;
            ALTER TABLE media_watch_sessions DROP COLUMN run_id;
            DROP TABLE media_content_runs;
            PRAGMA writable_schema=ON;
            UPDATE sqlite_master SET sql=replace(sql,
            '(tracking_status IN (''watching'', ''pending'', ''paused'', ''completed'', ''dropped'', ''waiting_content'') OR (kind = ''anime'' AND tracking_status = ''to_resume''))',
            'tracking_status IN (''watching'', ''pending'', ''paused'', ''completed'', ''dropped'', ''waiting_content'')')
            WHERE name='media_titles';
            PRAGMA writable_schema=RESET;
            PRAGMA user_version=35;").unwrap();
        let mut anime = title();
        let item = content(anime.id.clone(), "Temporada 1", 0);
        {
            let mut repository = MediaRepository::new(&mut connection);
            repository.create_title(&anime).unwrap();
            repository.create_content(&item).unwrap();
        }
        apply_migrations(&mut connection).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        let before = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(before.title.name, anime.name);
        assert_eq!(before.contents[0].id, item.id);
        anime.change_status(TrackingStatus::ToResume).unwrap();
        repository.update_title(&anime).unwrap();
        let restored = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(restored.title.status, TrackingStatus::ToResume);
        assert_eq!(restored.contents[0].status, item.status);
        assert_eq!(restored.contents[0].watched_episodes, item.watched_episodes);
        assert!(connection
            .execute("UPDATE media_contents SET tracking_status='to_resume'", [])
            .is_err());
        assert!(connection
            .execute(
                "UPDATE media_titles SET kind='movie' WHERE id=?1",
                [anime.id.as_str()]
            )
            .is_err());
        assert_eq!(
            connection
                .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
                .unwrap(),
            "ok"
        );
        assert!(!connection
            .prepare("PRAGMA foreign_key_check")
            .unwrap()
            .query([])
            .unwrap()
            .next()
            .unwrap()
            .is_some());
    }

    #[test]
    fn content_runs_continue_ranges_restart_and_preserve_main_progress() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let anime = title();
        let mut season = content(anime.id.clone(), "HxH", 0);
        season.total_episodes = Some(148);
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&anime).unwrap();
        repository.create_content(&season).unwrap();
        let date = NaiveDate::from_ymd_opt(2021, 6, 30).unwrap();
        repository
            .set_content_progress(&season.id, 148, date, SessionSource::ManualAdjustment)
            .unwrap();
        repository
            .register_content_run_range(
                &season.id,
                None,
                1,
                60,
                NaiveDate::from_ymd_opt(2025, 12, 5).unwrap(),
                "inProgress",
            )
            .unwrap();
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        let runs = super::super::service::content_run_summaries(&aggregate);
        let repeat = runs.iter().find(|r| !r.is_progress_run).unwrap();
        assert_eq!(repeat.next_episode, Some(61));
        assert_eq!(repeat.ordinal, 1);
        let run_id = repeat.id.clone();
        repository
            .register_content_run_range(
                &season.id,
                Some(&run_id),
                61,
                75,
                NaiveDate::from_ymd_opt(2026, 1, 3).unwrap(),
                "inProgress",
            )
            .unwrap();
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(aggregate.contents[0].watched_episodes, 148);
        assert_eq!(aggregate.title.status, anime.status);
        assert_eq!(aggregate.sessions.len(), 223);
        let runs = super::super::service::content_run_summaries(&aggregate);
        assert_eq!(
            runs.iter().find(|r| r.id == run_id).unwrap().next_episode,
            Some(76)
        );
        repository
            .set_content_run_status(&season.id, &run_id, "interrupted")
            .unwrap();
        assert!(repository
            .register_content_run_range(&season.id, Some(&run_id), 76, 80, date, "inProgress")
            .is_err());
        repository
            .register_content_run_range(
                &season.id,
                None,
                1,
                10,
                NaiveDate::from_ymd_opt(2026, 2, 3).unwrap(),
                "interrupted",
            )
            .unwrap();
        repository
            .set_content_run_status(&season.id, &run_id, "inProgress")
            .unwrap();
        repository
            .register_content_run_range(
                &season.id,
                Some(&run_id),
                76,
                148,
                NaiveDate::from_ymd_opt(2026, 3, 3).unwrap(),
                "completed",
            )
            .unwrap();
        let saved = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(saved.contents[0].watched_episodes, 148);
        let runs = super::super::service::content_run_summaries(&saved);
        assert_eq!(runs.len(), 3);
        assert_eq!(
            runs.iter().find(|r| r.id == run_id).unwrap().status,
            "completed"
        );
        assert_eq!(
            runs.iter().find(|r| r.id == run_id).unwrap().next_episode,
            None
        );
        assert!(runs
            .iter()
            .any(|r| r.watched == 10 && r.status == "interrupted"));
        // Correcting a closed run must not silently reopen it, nor advertise a
        // continuation that the repository will reject until explicitly resumed.
        let last_block = saved
            .sessions
            .iter()
            .find(|s| s.run_id.as_deref() == Some(&run_id) && s.episode_number == Some(76))
            .unwrap()
            .registration_id
            .clone();
        repository
            .update_content_registration_range(&last_block, &season.id, date, 70, Some(76))
            .unwrap();
        let corrected = repository.find_aggregate(&anime.id).unwrap().unwrap();
        let runs = super::super::service::content_run_summaries(&corrected);
        let repeat = runs.iter().find(|r| r.id == run_id).unwrap();
        assert_eq!(repeat.status, "completed");
        assert!(!repeat.can_complete);
        assert_eq!(repeat.next_episode, Some(146));
        repository
            .set_content_run_status(&season.id, &run_id, "inProgress")
            .unwrap();
        repository
            .register_content_run_range(&season.id, Some(&run_id), 146, 148, date, "completed")
            .unwrap();
    }

    #[test]
    fn content_run_range_validation_is_transactional() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let anime = title();
        let season = content(anime.id.clone(), "T1", 0);
        let other = content(anime.id.clone(), "T2", 1);
        let date = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&anime).unwrap();
        repository.create_content(&season).unwrap();
        repository.create_content(&other).unwrap();
        repository
            .register_content_run_range(&season.id, None, 1, 3, date, "inProgress")
            .unwrap();
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        let run_id = aggregate.sessions[0].run_id.clone().unwrap();
        for (first, last) in [(0, 3), (5, 4), (1, 4), (4, 13), (4, u32::MAX)] {
            assert!(repository
                .register_content_run_range(
                    &season.id,
                    Some(&run_id),
                    first,
                    last,
                    date,
                    "inProgress"
                )
                .is_err());
        }
        assert!(repository
            .register_content_run_range(&other.id, Some(&run_id), 4, 6, date, "inProgress")
            .is_err());
        assert!(repository
            .register_content_run_range(&season.id, Some(&run_id), 4, 6, date, "completed")
            .is_err());
        assert!(repository
            .register_content_run_range(&season.id, None, 1, 3, date, "bad")
            .is_err());
        assert!(repository
            .register_content_run_range(
                &season.id,
                None,
                1,
                3,
                NaiveDate::from_ymd_opt(2999, 1, 1).unwrap(),
                "inProgress"
            )
            .is_err());
        assert!(repository
            .set_content_run_status(&season.id, &run_id, "completed")
            .is_err());
        assert_eq!(
            repository
                .find_aggregate(&anime.id)
                .unwrap()
                .unwrap()
                .sessions
                .len(),
            3
        );
        assert_eq!(
            repository
                .find_content(&season.id)
                .unwrap()
                .unwrap()
                .watched_episodes,
            0
        );
    }

    #[test]
    fn content_run_edit_keeps_range_start_and_prevents_overlap() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let anime = title();
        let season = content(anime.id.clone(), "T1", 0);
        let date = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&anime).unwrap();
        repository.create_content(&season).unwrap();
        repository
            .register_content_run_range(&season.id, None, 1, 3, date, "inProgress")
            .unwrap();
        let run_id = repository
            .find_aggregate(&anime.id)
            .unwrap()
            .unwrap()
            .sessions[0]
            .run_id
            .clone()
            .unwrap();
        repository
            .register_content_run_range(
                &season.id,
                Some(&run_id),
                4,
                6,
                date.succ_opt().unwrap(),
                "inProgress",
            )
            .unwrap();
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        let registration = aggregate
            .sessions
            .iter()
            .find(|s| s.episode_number == Some(4))
            .unwrap()
            .registration_id
            .clone();
        repository
            .update_content_registration_range(&registration, &season.id, date, 4, Some(4))
            .unwrap();
        assert!(repository
            .update_content_registration_range(&registration, &season.id, date, 4, Some(3))
            .is_err());
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        let block: Vec<_> = aggregate
            .sessions
            .iter()
            .filter(|s| s.registration_id == registration)
            .collect();
        assert_eq!(block.iter().filter_map(|s| s.episode_number).min(), Some(4));
        assert_eq!(block.iter().filter_map(|s| s.episode_number).max(), Some(7));
        assert!(block.iter().all(|s| s.run_id.as_deref() == Some(&run_id)));
        let ids: Vec<_> = block.iter().map(|s| s.id.clone()).collect();
        for id in ids {
            repository.delete_latest_session(&id).unwrap();
        }
        let aggregate = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(
            super::super::service::content_run_summaries(&aggregate)[0].next_episode,
            Some(4)
        );
        assert_eq!(aggregate.contents[0].watched_episodes, 0);
    }

    #[test]
    fn content_runs_migration_preserves_legacy_sessions() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let anime = title();
        let season = content(anime.id.clone(), "T1", 0);
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&anime).unwrap();
        repository.create_content(&season).unwrap();
        repository
            .set_content_progress(
                &season.id,
                12,
                NaiveDate::from_ymd_opt(2026, 3, 30).unwrap(),
                SessionSource::ManualAdjustment,
            )
            .unwrap();
        repository
            .register_content_rewatch(&season.id, 6, NaiveDate::from_ymd_opt(2022, 5, 2).unwrap())
            .unwrap();
        let before = repository.find_aggregate(&anime.id).unwrap().unwrap();
        connection.execute_batch("DROP INDEX idx_media_watch_sessions_run_episode; ALTER TABLE media_watch_sessions DROP COLUMN run_id; DROP TABLE media_content_runs; PRAGMA user_version=36;").unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        let after = repository.find_aggregate(&anime.id).unwrap().unwrap();
        assert_eq!(before.sessions.len(), after.sessions.len());
        for old in &before.sessions {
            let new = after.sessions.iter().find(|s| s.id == old.id).unwrap();
            assert_eq!(new.registration_id, old.registration_id);
            assert_eq!(new.watched_on, old.watched_on);
            assert_eq!(new.episode_number, old.episode_number);
            assert_eq!(new.is_rewatch, old.is_rewatch);
        }
        let runs = super::super::service::content_run_summaries(&after);
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].ordinal, 0);
        assert_eq!(runs[0].watched, 6);
        assert_eq!(runs[1].status, "completed");
        assert!(runs[1].is_progress_run);
        assert_eq!(after.contents[0].watched_episodes, 12);
        assert_eq!(after.title.score, before.title.score);
        assert_eq!(
            connection
                .query_row("PRAGMA integrity_check", [], |r| r.get::<_, String>(0))
                .unwrap(),
            "ok"
        );
        assert!(!connection
            .prepare("PRAGMA foreign_key_check")
            .unwrap()
            .query([])
            .unwrap()
            .next()
            .unwrap()
            .is_some());
    }

    #[test]
    fn hierarchy_and_sessions_survive_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut title = title();
        title.change_cover_position(22.5, 68.0, 1.35).unwrap();
        let title_id = title.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        let content = MediaContent::new(
            MediaContentId::generate(),
            title_id.clone(),
            MediaContentDraft {
                name: "Temporada 1".into(),
                kind: ContentKind::Season,
                status: TrackingStatus::Watching,
                canon_status: CanonStatus::Canon,
                total_episodes: Some(13),
                watched_episodes: 0,
                studio: Some("Bones".into()),
                score: None,
                opinion: None,
                notes: None,
                started_on: None,
                released_on: None,
                finished_on: None,
            },
            0,
        )
        .unwrap();
        let content_id = content.id.clone();
        repository.create_content(&content).unwrap();
        repository
            .set_content_progress(
                &content_id,
                1,
                NaiveDate::from_ymd_opt(2026, 8, 16).unwrap(),
                SessionSource::QuickAdd,
            )
            .unwrap();
        let restored = repository.find_aggregate(&title_id).unwrap().unwrap();
        assert_eq!(restored.title.primary_studio.as_deref(), Some("Bones"));
        assert_eq!(restored.title.cover_position_x, 22.5);
        assert_eq!(restored.title.cover_position_y, 68.0);
        assert_eq!(restored.title.cover_zoom, 1.35);
        assert!(repository
            .list_studios()
            .unwrap()
            .contains(&"Bones".to_owned()));
        assert_eq!(restored.contents[0].watched_episodes, 1);
        assert_eq!(restored.sessions.len(), 1);
    }

    #[test]
    fn completed_anime_movie_can_register_its_first_explicit_viewing() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let movie = MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Your Name".into(),
                alternative_title: None,
                genres: vec!["Romance".into()],
                primary_studio: None,
                kind: MediaKind::Movie,
                is_anime: true,
                status: TrackingStatus::Completed,
                score: Some(9.0),
                opinion: None,
                favorite: false,
                started_on: None,
                finished_on: None,
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap();
        let id = movie.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&movie).unwrap();

        assert_eq!(
            repository.find_title(&id).unwrap().unwrap().watched_units,
            0
        );
        repository
            .set_title_progress(
                &id,
                1,
                NaiveDate::from_ymd_opt(2026, 8, 31).unwrap(),
                SessionSource::QuickAdd,
            )
            .unwrap();

        let restored = repository.find_aggregate(&id).unwrap().unwrap();
        assert_eq!(restored.title.watched_units, 1);
        assert_eq!(restored.sessions.len(), 1);
        assert_eq!(
            restored.sessions[0].watched_on,
            NaiveDate::from_ymd_opt(2026, 8, 31).unwrap()
        );
    }

    #[test]
    fn movie_viewings_keep_each_rewatch_and_sync_the_title() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let movie = MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Arrival".into(),
                alternative_title: None,
                genres: vec![],
                primary_studio: None,
                kind: MediaKind::Movie,
                is_anime: false,
                status: TrackingStatus::Pending,
                score: None,
                opinion: None,
                favorite: false,
                started_on: None,
                finished_on: None,
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap();
        let id = movie.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&movie).unwrap();
        for day in [1, 8] {
            let now = Utc::now().to_rfc3339();
            repository
                .create_movie_viewing(&MovieViewing {
                    id: MovieViewingId::generate(),
                    title_id: id.clone(),
                    watched_on: NaiveDate::from_ymd_opt(2026, 8, day).unwrap(),
                    created_at: now.clone(),
                    updated_at: now,
                })
                .unwrap();
        }
        assert_eq!(repository.movie_viewings(&id).unwrap().len(), 2);
        let restored = repository.find_title(&id).unwrap().unwrap();
        assert_eq!(restored.status, TrackingStatus::Completed);
        assert_eq!(restored.finished_on, NaiveDate::from_ymd_opt(2026, 8, 8));
        let now = Utc::now().to_rfc3339();
        let earlier = MovieViewing {
            id: MovieViewingId::generate(),
            title_id: id,
            watched_on: NaiveDate::from_ymd_opt(2026, 7, 31).unwrap(),
            created_at: now.clone(),
            updated_at: now,
        };
        assert!(matches!(
            repository.create_movie_viewing(&earlier),
            Err(MediaRepositoryError::ViewingBeforeFirst)
        ));
    }

    #[test]
    fn anime_movie_rewatches_are_included_in_the_shared_history() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let movie = MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Your Name".into(),
                alternative_title: None,
                genres: vec!["Romance".into()],
                primary_studio: None,
                kind: MediaKind::Movie,
                is_anime: true,
                status: TrackingStatus::Completed,
                score: Some(9.0),
                opinion: None,
                favorite: true,
                started_on: None,
                finished_on: None,
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap();
        let id = movie.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&movie).unwrap();
        for day in [1, 15] {
            let now = Utc::now().to_rfc3339();
            repository
                .create_movie_viewing(&MovieViewing {
                    id: MovieViewingId::generate(),
                    title_id: id.clone(),
                    watched_on: NaiveDate::from_ymd_opt(2026, 8, day).unwrap(),
                    created_at: now.clone(),
                    updated_at: now,
                })
                .unwrap();
        }

        let entries: Vec<_> = repository
            .list_history()
            .unwrap()
            .into_iter()
            .filter(|entry| entry.title_id == id)
            .collect();
        assert_eq!(entries.len(), 2);
        assert!(entries
            .iter()
            .all(|entry| entry.is_anime && entry.can_delete));
    }

    #[test]
    fn episode_history_edits_and_deletes_keep_progress_in_sync() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let title_id = title.id.clone();
        let content = content(title_id.clone(), "Temporada 1", 0);
        let content_id = content.id.clone();
        let first_date = NaiveDate::from_ymd_opt(2026, 8, 17).unwrap();
        let corrected_date = NaiveDate::from_ymd_opt(2026, 8, 16).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        repository.create_content(&content).unwrap();

        repository
            .set_content_progress(&content_id, 3, first_date, SessionSource::ManualAdjustment)
            .unwrap();
        let aggregate = repository.find_aggregate(&title_id).unwrap().unwrap();
        let mut episodes: Vec<_> = aggregate
            .sessions
            .iter()
            .filter_map(|session| session.episode_number)
            .collect();
        episodes.sort_unstable();
        assert_eq!(episodes, vec![1, 2, 3]);

        let first = aggregate
            .sessions
            .iter()
            .find(|session| session.episode_number == Some(1))
            .unwrap();
        assert!(matches!(
            repository.delete_latest_session(&first.id),
            Err(MediaRepositoryError::SessionCannotBeRemoved)
        ));
        repository
            .update_session_date(&first.id, corrected_date)
            .unwrap();

        let latest = aggregate
            .sessions
            .iter()
            .find(|session| session.episode_number == Some(3))
            .unwrap();
        repository.delete_latest_session(&latest.id).unwrap();
        assert_eq!(
            repository
                .find_content(&content_id)
                .unwrap()
                .unwrap()
                .watched_episodes,
            2
        );

        repository
            .set_content_progress(&content_id, 6, first_date, SessionSource::ManualAdjustment)
            .unwrap();
        repository
            .set_content_progress(&content_id, 4, first_date, SessionSource::ManualAdjustment)
            .unwrap();
        let aggregate = repository.find_aggregate(&title_id).unwrap().unwrap();
        let mut episodes: Vec<_> = aggregate
            .sessions
            .iter()
            .filter_map(|session| session.episode_number)
            .collect();
        episodes.sort_unstable();
        assert_eq!(episodes, vec![1, 2, 3, 4]);
        assert_eq!(aggregate.contents[0].watched_episodes, 4);
        assert_eq!(
            aggregate
                .sessions
                .iter()
                .find(|session| session.episode_number == Some(1))
                .unwrap()
                .watched_on,
            corrected_date
        );
    }

    #[test]
    fn manual_registration_preserves_status_and_exposes_release_in_history() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let mut season = content(title.id.clone(), "Solo Leveling T2", 0);
        season.status = TrackingStatus::Completed;
        season.total_episodes = Some(13);
        season.released_on = Some(NaiveDate::from_ymd_opt(2025, 1, 5).unwrap());
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        repository.create_content(&season).unwrap();
        repository
            .set_content_progress(
                &season.id,
                3,
                season.released_on.unwrap(),
                SessionSource::ManualAdjustment,
            )
            .unwrap();
        let saved = repository.find_content(&season.id).unwrap().unwrap();
        assert_eq!(saved.watched_episodes, 3);
        assert_eq!(saved.status, TrackingStatus::Completed);
        let entries = repository.list_history().unwrap();
        assert_eq!(entries.len(), 3);
        assert!(entries
            .iter()
            .all(|entry| entry.released_on == season.released_on));
        assert!(repository
            .find_aggregate(&title.id)
            .unwrap()
            .unwrap()
            .sessions
            .iter()
            .all(|session| !session.is_rewatch));
    }

    #[test]
    fn anime_content_rewatches_are_independent_editable_instances() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let title_id = title.id.clone();
        let content = content(title_id.clone(), "Temporada 1", 0);
        let content_id = content.id.clone();
        let first_date = NaiveDate::from_ymd_opt(2026, 7, 1).unwrap();
        let rewatch_date = NaiveDate::from_ymd_opt(2026, 8, 1).unwrap();
        let corrected_date = NaiveDate::from_ymd_opt(2026, 8, 2).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        repository.create_content(&content).unwrap();
        repository
            .set_content_progress(&content_id, 12, first_date, SessionSource::ManualAdjustment)
            .unwrap();
        repository
            .register_content_rewatch(&content_id, 12, rewatch_date)
            .unwrap();

        let aggregate = repository.find_aggregate(&title_id).unwrap().unwrap();
        let rewatch_registration = aggregate
            .sessions
            .iter()
            .find(|session| session.is_rewatch)
            .unwrap()
            .registration_id
            .clone();
        let rewatch_ids: Vec<_> = aggregate
            .sessions
            .iter()
            .filter(|session| session.is_rewatch)
            .map(|session| session.id.clone())
            .collect();
        assert_eq!(rewatch_ids.len(), 12);
        assert_eq!(aggregate.contents[0].watched_episodes, 12);

        repository
            .update_content_registration(&rewatch_registration, &content_id, corrected_date, 8)
            .unwrap();
        assert!(matches!(
            repository.update_content_registration(
                &rewatch_registration,
                &content_id,
                corrected_date,
                13
            ),
            Err(MediaRepositoryError::InvalidStoredValue(
                "cantidad de episodios"
            ))
        ));
        let rewatch_ids: Vec<_> = repository
            .find_aggregate(&title_id)
            .unwrap()
            .unwrap()
            .sessions
            .iter()
            .filter(|session| session.is_rewatch)
            .map(|session| session.id.clone())
            .collect();
        assert_eq!(rewatch_ids.len(), 8);
        assert!(repository
            .find_aggregate(&title_id)
            .unwrap()
            .unwrap()
            .sessions
            .iter()
            .filter(|session| session.is_rewatch)
            .all(|session| session.watched_on == corrected_date));
        repository
            .set_content_progress(&content_id, 11, first_date, SessionSource::ManualAdjustment)
            .unwrap();
        assert_eq!(
            repository
                .find_aggregate(&title_id)
                .unwrap()
                .unwrap()
                .sessions
                .iter()
                .filter(|session| session.is_rewatch)
                .count(),
            8
        );
        for id in rewatch_ids {
            repository.delete_latest_session(&id).unwrap();
        }
        let aggregate = repository.find_aggregate(&title_id).unwrap().unwrap();
        assert_eq!(aggregate.contents[0].watched_episodes, 11);
        assert!(aggregate.sessions.iter().all(|session| !session.is_rewatch));
    }

    #[test]
    fn latest_original_registration_can_change_its_episode_count() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let title_id = title.id.clone();
        let content = content(title_id.clone(), "Temporada 1", 0);
        let content_id = content.id.clone();
        let date = NaiveDate::from_ymd_opt(2026, 8, 3).unwrap();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        repository.create_content(&content).unwrap();
        repository
            .set_content_progress(&content_id, 4, date, SessionSource::ManualAdjustment)
            .unwrap();
        let registration_id = repository
            .find_aggregate(&title_id)
            .unwrap()
            .unwrap()
            .sessions[0]
            .registration_id
            .clone();

        repository
            .update_content_registration(&registration_id, &content_id, date, 6)
            .unwrap();
        let aggregate = repository.find_aggregate(&title_id).unwrap().unwrap();
        assert_eq!(aggregate.contents[0].watched_episodes, 6);
        assert_eq!(aggregate.sessions.len(), 6);

        assert!(matches!(
            repository.update_content_registration(&registration_id, &content_id, date, 13),
            Err(MediaRepositoryError::InvalidStoredValue(
                "cantidad de episodios"
            ))
        ));
    }

    #[test]
    fn anime_catalog_number_genres_notes_and_decimal_scores_survive_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut title = title();
        let title_id = title.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        let number = repository.next_anime_catalog_number().unwrap();
        title.assign_catalog_number(number).unwrap();
        repository.create_title(&title).unwrap();

        let mut content = content(title_id.clone(), "Temporada 1", 0);
        content.score = Some(8.31);
        content.notes = Some("Continuación principal".into());
        content.started_on = NaiveDate::from_ymd_opt(2026, 8, 1);
        repository.create_content(&content).unwrap();

        let restored = repository.find_aggregate(&title_id).unwrap().unwrap();
        assert_eq!(restored.title.catalog_number, Some(1));
        assert_eq!(restored.title.genres, vec!["Acción"]);
        assert_eq!(restored.contents[0].score, Some(8.31));
        assert_eq!(
            restored.contents[0].notes.as_deref(),
            Some("Continuación principal")
        );
        assert_eq!(
            restored.contents[0].started_on,
            NaiveDate::from_ymd_opt(2026, 8, 1)
        );
    }

    #[test]
    fn catalog_migration_preserves_existing_hierarchy_and_sessions() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .unwrap();
        connection
            .execute_batch(include_str!(
                "../../migrations/0012_create_media_tracker.sql"
            ))
            .unwrap();
        connection
            .execute_batch(include_str!(
                "../../migrations/0013_split_audiovisual_areas.sql"
            ))
            .unwrap();
        connection
            .execute_batch(
                "INSERT INTO media_titles
             (id, name, normalized_name, kind, tracking_status, score, is_favorite,
              is_archived, watched_units, created_at, updated_at, is_anime)
             VALUES ('00000000-0000-4000-8000-000000000001', 'Anime', 'anime', 'anime',
                     'completed', 8.5, 0, 0, 0, '2026-08-01', '2026-08-01', 1);
             INSERT INTO media_contents
             (id, title_id, name, kind, tracking_status, canon_status, total_episodes,
              watched_episodes, score, position, created_at, updated_at)
             VALUES ('00000000-0000-4000-8000-000000000002',
                     '00000000-0000-4000-8000-000000000001', 'Temporada 1', 'season',
                     'completed', 'canon', 12, 12, 8.5, 0, '2026-08-01', '2026-08-01');
             INSERT INTO media_watch_sessions
             (id, content_id, watched_on, delta, source, created_at)
             VALUES ('session', '00000000-0000-4000-8000-000000000002', '2026-08-01',
                     1, 'quick_add', '2026-08-01');",
            )
            .unwrap();

        connection
            .execute_batch(include_str!(
                "../../migrations/0014_expand_anime_catalog.sql"
            ))
            .unwrap();

        assert_eq!(
            connection
                .query_row("SELECT catalog_number FROM media_titles", [], |row| row
                    .get::<_, u32>(0))
                .unwrap(),
            1
        );
        assert_eq!(
            connection
                .query_row("SELECT COUNT(*) FROM media_watch_sessions", [], |row| row
                    .get::<_, u32>(
                    0
                ))
                .unwrap(),
            1
        );
        assert!(connection
            .prepare("PRAGMA foreign_key_check")
            .unwrap()
            .query([])
            .unwrap()
            .next()
            .unwrap()
            .is_none());
    }

    #[test]
    fn permanent_delete_requires_archive_and_cascades() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let id = title.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        let content = content(id.clone(), "Temporada 1", 0);
        let content_id = content.id.clone();
        repository.create_content(&content).unwrap();
        repository
            .set_content_progress(
                &content_id,
                1,
                NaiveDate::from_ymd_opt(2026, 8, 16).unwrap(),
                SessionSource::QuickAdd,
            )
            .unwrap();
        assert!(matches!(
            repository.delete_archived_title(&id),
            Err(MediaRepositoryError::MustBeArchived)
        ));
        repository.archive_title(&id).unwrap();
        repository.delete_archived_title(&id).unwrap();
        assert!(repository.find_title(&id).unwrap().is_none());
        let contents: u32 = repository
            .connection
            .query_row("SELECT COUNT(*) FROM media_contents", [], |row| row.get(0))
            .unwrap();
        let sessions: u32 = repository
            .connection
            .query_row("SELECT COUNT(*) FROM media_watch_sessions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!((contents, sessions), (0, 0));
    }

    #[test]
    fn deleting_content_removes_its_sessions_and_compacts_positions() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
        let title_id = title.id.clone();
        let first = content(title_id.clone(), "Temporada 1", 0);
        let second = content(title_id.clone(), "Temporada 2", 1);
        let first_id = first.id.clone();
        let second_id = second.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&title).unwrap();
        repository.create_content(&first).unwrap();
        repository.create_content(&second).unwrap();
        repository
            .set_content_progress(
                &first_id,
                2,
                NaiveDate::from_ymd_opt(2026, 8, 16).unwrap(),
                SessionSource::QuickAdd,
            )
            .unwrap();

        repository.delete_content(&first_id).unwrap();

        assert!(repository.find_content(&first_id).unwrap().is_none());
        assert_eq!(
            repository
                .find_content(&second_id)
                .unwrap()
                .unwrap()
                .position,
            0
        );
        let sessions: u32 = repository
            .connection
            .query_row("SELECT COUNT(*) FROM media_watch_sessions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(sessions, 0);
    }

    #[test]
    fn simple_series_fields_survive_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let series = MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Severance".into(),
                alternative_title: None,
                genres: Vec::new(),
                primary_studio: None,
                kind: MediaKind::Series,
                is_anime: false,
                status: TrackingStatus::Watching,
                score: Some(9.0),
                opinion: None,
                favorite: true,
                started_on: NaiveDate::from_ymd_opt(2026, 8, 1),
                finished_on: None,
                current_season: Some(2),
                current_episode: Some(4),
            },
        )
        .unwrap();
        let id = series.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&series).unwrap();

        let restored = repository.find_title(&id).unwrap().unwrap();
        assert!(restored.belongs_to(crate::media::model::MediaArea::Series));
        assert_eq!(
            (restored.current_season, restored.current_episode),
            (Some(2), Some(4))
        );
        assert_eq!(restored.started_on, NaiveDate::from_ymd_opt(2026, 8, 1));
    }

    #[test]
    fn relaxed_cover_zoom_survives_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut media = title();
        media.change_cover_position(50.0, 50.0, 0.75).unwrap();
        let id = media.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&media).unwrap();
        assert_eq!(
            repository.find_title(&id).unwrap().unwrap().cover_zoom,
            0.75
        );
    }

    #[test]
    fn series_runs_preserve_rewatches_and_synchronize_dates() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut series = title();
        series.kind = MediaKind::Series;
        series.is_anime = false;
        let id = series.id.clone();
        let mut repository = MediaRepository::new(&mut connection);
        repository.create_title(&series).unwrap();
        for (start, finish) in [(1, Some(10)), (20, None)] {
            let now = Utc::now().to_rfc3339();
            repository
                .create_series_run(&SeriesRun {
                    id: SeriesRunId::generate(),
                    title_id: id.clone(),
                    started_on: NaiveDate::from_ymd_opt(2026, 8, start).unwrap(),
                    finished_on: finish.and_then(|day| NaiveDate::from_ymd_opt(2026, 8, day)),
                    created_at: now.clone(),
                    updated_at: now,
                })
                .unwrap();
        }
        assert_eq!(repository.series_runs(&id).unwrap().len(), 2);
        assert_eq!(repository.all_series_runs().unwrap().len(), 2);
        let restored = repository.find_title(&id).unwrap().unwrap();
        assert_eq!(restored.status, TrackingStatus::Watching);
        assert_eq!(restored.started_on, NaiveDate::from_ymd_opt(2026, 8, 1));
        assert_eq!(restored.finished_on, None);
    }
}
