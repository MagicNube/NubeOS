//! Persistencia SQLite del seguimiento audiovisual.

use std::fmt;

use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::{
    model::{
        CanonStatus, ContentKind, ManagedCover, MediaContent, MediaContentId, MediaError,
        MediaKind, MediaTitle, MediaTitleId, SessionSource, TrackingStatus, WatchSession,
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
}

impl fmt::Display for MediaRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
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
              created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                     ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?23)",
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
                 catalog_number = ?21, genres_json = ?22, updated_at = ?23
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
                        current_season, current_episode, catalog_number, genres_json
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
                        current_season, current_episode, catalog_number, genres_json
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
            "SELECT DISTINCT trim(studio) FROM media_contents
             WHERE studio IS NOT NULL AND trim(studio) != ''
             ORDER BY trim(studio) COLLATE NOCASE",
        )?;
        let studios = statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(studios)
    }

    pub fn list_history(&mut self) -> Result<Vec<MediaHistoryEntry>, MediaRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT sessions.id, titles.id, titles.name, titles.kind, titles.is_anime,
                    contents.id, contents.name, contents.kind, sessions.watched_on,
                    sessions.episode_number,
                    CASE
                      WHEN contents.id IS NOT NULL THEN contents.watched_episodes = sessions.episode_number
                      ELSE titles.watched_units = sessions.episode_number
                    END
             FROM media_watch_sessions sessions
             JOIN media_titles titles
               ON titles.id = sessions.title_id
               OR titles.id = (SELECT title_id FROM media_contents WHERE id = sessions.content_id)
             LEFT JOIN media_contents contents ON contents.id = sessions.content_id
             WHERE sessions.episode_number IS NOT NULL
             ORDER BY sessions.watched_on DESC, sessions.created_at DESC",
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
            for episode_number in (current + 1)..=next {
                insert_session(
                    &transaction,
                    Some(title_id),
                    None,
                    watched_on,
                    episode_number,
                    source,
                )?;
            }
        } else if next < current {
            transaction.execute(
                "DELETE FROM media_watch_sessions
                 WHERE title_id = ?1 AND episode_number IS NOT NULL AND episode_number > ?2",
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
            for episode_number in (current + 1)..=next {
                insert_session(
                    &transaction,
                    None,
                    Some(content_id),
                    watched_on,
                    episode_number,
                    source,
                )?;
            }
        } else if next < current {
            transaction.execute(
                "DELETE FROM media_watch_sessions
                 WHERE content_id = ?1 AND episode_number IS NOT NULL AND episode_number > ?2",
                params![content_id.as_str(), next],
            )?;
        }
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

    pub fn delete_latest_session(&mut self, session_id: &str) -> Result<(), MediaRepositoryError> {
        let target: Option<(Option<String>, Option<String>, Option<u32>)> = self
            .connection
            .query_row(
                "SELECT title_id, content_id, episode_number
                 FROM media_watch_sessions WHERE id = ?1",
                [session_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()?;
        let (title_id, content_id, episode_number) =
            target.ok_or(MediaRepositoryError::NotFound)?;
        let episode_number = episode_number.ok_or(MediaRepositoryError::SessionCannotBeRemoved)?;
        let transaction = self.connection.transaction()?;
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
                    sessions.delta, sessions.source, sessions.episode_number
             FROM media_watch_sessions sessions
             LEFT JOIN media_contents contents ON contents.id = sessions.content_id
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

fn insert_session(
    transaction: &Transaction<'_>,
    title_id: Option<&MediaTitleId>,
    content_id: Option<&MediaContentId>,
    watched_on: NaiveDate,
    episode_number: u32,
    source: SessionSource,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO media_watch_sessions
         (id, title_id, content_id, watched_on, delta, source, created_at, episode_number)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![
            uuid::Uuid::new_v4().to_string(),
            title_id.map(MediaTitleId::as_str),
            content_id.map(MediaContentId::as_str),
            watched_on.to_string(),
            session_source_to_str(source),
            Utc::now().to_rfc3339(),
            episode_number,
        ],
    )?;
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
    fn hierarchy_and_sessions_survive_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let title = title();
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
        assert_eq!(restored.contents[0].watched_episodes, 1);
        assert_eq!(restored.sessions.len(), 1);
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
        content.score = Some(8.3);
        content.notes = Some("Continuación principal".into());
        content.started_on = NaiveDate::from_ymd_opt(2026, 8, 1);
        repository.create_content(&content).unwrap();

        let restored = repository.find_aggregate(&title_id).unwrap().unwrap();
        assert_eq!(restored.title.catalog_number, Some(1));
        assert_eq!(restored.title.genres, vec!["Acción"]);
        assert_eq!(restored.contents[0].score, Some(8.3));
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
}
