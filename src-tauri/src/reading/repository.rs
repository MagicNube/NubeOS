use std::fmt;

use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use super::model::{Book, BookId, ManagedReadingCover, ReadingError, ReadingStatus};

#[derive(Debug)]
pub enum ReadingRepositoryError {
    Database(rusqlite::Error),
    InvalidStored(ReadingError),
    InvalidStoredValue(&'static str),
    NotFound,
    MustBeArchived,
}

impl fmt::Display for ReadingRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::InvalidStored(error) => write!(formatter, "Libro guardado inválido: {error}"),
            Self::InvalidStoredValue(field) => {
                write!(formatter, "El valor guardado de {field} no es válido.")
            }
            Self::NotFound => formatter.write_str("No existe el libro solicitado."),
            Self::MustBeArchived => {
                formatter.write_str("El libro debe estar archivado antes de eliminarlo.")
            }
        }
    }
}

impl std::error::Error for ReadingRepositoryError {}

impl From<rusqlite::Error> for ReadingRepositoryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

pub struct ReadingRepository<'connection> {
    connection: &'connection mut Connection,
}

impl<'connection> ReadingRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn create(&mut self, book: &Book) -> Result<(), ReadingRepositoryError> {
        let now = &book.updated_at;
        self.connection.execute(
            "INSERT INTO reading_books
             (id, title, normalized_title, author, normalized_author, genres_json,
              reading_status, score, opinion, is_favorite, started_on, finished_on,
              is_archived, created_at, updated_at, cover_file_name, cover_mime_type, cover_size_bytes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, ?13, ?13, ?14, ?15, ?16)",
            params![
                book.id.as_str(),
                book.title,
                normalize(&book.title),
                book.author,
                normalize(&book.author),
                serde_json::to_string(&book.genres).unwrap_or_else(|_| "[]".into()),
                status_to_str(book.status),
                book.score,
                book.opinion,
                book.favorite,
                book.started_on.map(|date| date.to_string()),
                book.finished_on.map(|date| date.to_string()),
                now,
                book.cover.as_ref().map(|cover| &cover.file_name),
                book.cover.as_ref().map(|cover| &cover.mime_type),
                book.cover.as_ref().map(|cover| cover.size_bytes),
            ],
        )?;
        Ok(())
    }

    pub fn update(&mut self, book: &Book) -> Result<(), ReadingRepositoryError> {
        let affected = self.connection.execute(
            "UPDATE reading_books SET title = ?2, normalized_title = ?3, author = ?4,
             normalized_author = ?5, genres_json = ?6, reading_status = ?7, score = ?8,
             opinion = ?9, is_favorite = ?10, started_on = ?11, finished_on = ?12,
             updated_at = ?13, cover_file_name = ?14, cover_mime_type = ?15,
             cover_size_bytes = ?16 WHERE id = ?1",
            params![
                book.id.as_str(),
                book.title,
                normalize(&book.title),
                book.author,
                normalize(&book.author),
                serde_json::to_string(&book.genres).unwrap_or_else(|_| "[]".into()),
                status_to_str(book.status),
                book.score,
                book.opinion,
                book.favorite,
                book.started_on.map(|date| date.to_string()),
                book.finished_on.map(|date| date.to_string()),
                book.updated_at,
                book.cover.as_ref().map(|cover| &cover.file_name),
                book.cover.as_ref().map(|cover| &cover.mime_type),
                book.cover.as_ref().map(|cover| cover.size_bytes),
            ],
        )?;
        if affected == 0 {
            return Err(ReadingRepositoryError::NotFound);
        }
        Ok(())
    }

    pub fn find(&mut self, id: &BookId) -> Result<Option<Book>, ReadingRepositoryError> {
        self.connection
            .query_row(
                "SELECT id, title, author, genres_json, reading_status, score, opinion,
             is_favorite, started_on, finished_on, is_archived, updated_at,
             cover_file_name, cover_mime_type, cover_size_bytes
             FROM reading_books WHERE id = ?1",
                [id.as_str()],
                book_from_row,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn list(&mut self, archived: bool) -> Result<Vec<Book>, ReadingRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id, title, author, genres_json, reading_status, score, opinion,
             is_favorite, started_on, finished_on, is_archived, updated_at,
             cover_file_name, cover_mime_type, cover_size_bytes
             FROM reading_books WHERE is_archived = ?1 ORDER BY updated_at DESC, title COLLATE NOCASE",
        )?;
        let books = statement
            .query_map([archived], book_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(books)
    }

    pub fn set_favorite(
        &mut self,
        id: &BookId,
        favorite: bool,
    ) -> Result<(), ReadingRepositoryError> {
        self.touching_update(
            "UPDATE reading_books SET is_favorite = ?2, updated_at = ?3 WHERE id = ?1",
            id,
            favorite,
        )
    }

    pub fn archive(&mut self, id: &BookId, archived: bool) -> Result<(), ReadingRepositoryError> {
        self.touching_update(
            "UPDATE reading_books SET is_archived = ?2, updated_at = ?3 WHERE id = ?1",
            id,
            archived,
        )
    }

    pub fn delete(&mut self, id: &BookId) -> Result<(), ReadingRepositoryError> {
        let archived: Option<bool> = self
            .connection
            .query_row(
                "SELECT is_archived FROM reading_books WHERE id = ?1",
                [id.as_str()],
                |row| row.get(0),
            )
            .optional()?;
        match archived {
            None => Err(ReadingRepositoryError::NotFound),
            Some(false) => Err(ReadingRepositoryError::MustBeArchived),
            Some(true) => {
                self.connection
                    .execute("DELETE FROM reading_books WHERE id = ?1", [id.as_str()])?;
                Ok(())
            }
        }
    }

    fn touching_update<T: rusqlite::ToSql>(
        &mut self,
        sql: &str,
        id: &BookId,
        value: T,
    ) -> Result<(), ReadingRepositoryError> {
        let affected = self
            .connection
            .execute(sql, params![id.as_str(), value, Utc::now().to_rfc3339()])?;
        if affected == 0 {
            return Err(ReadingRepositoryError::NotFound);
        }
        Ok(())
    }
}

fn book_from_row(row: &Row<'_>) -> rusqlite::Result<Book> {
    let id: String = row.get(0)?;
    let genres_json: String = row.get(3)?;
    let status: String = row.get(4)?;
    let started_on: Option<String> = row.get(8)?;
    let finished_on: Option<String> = row.get(9)?;
    Ok(Book {
        id: BookId::parse(&id).map_err(|_| conversion_error(0, "id"))?,
        title: row.get(1)?,
        author: row.get(2)?,
        genres: serde_json::from_str(&genres_json).map_err(|_| conversion_error(3, "genres"))?,
        status: status_from_str(&status).ok_or_else(|| conversion_error(4, "estado"))?,
        score: row.get(5)?,
        opinion: row.get(6)?,
        favorite: row.get(7)?,
        started_on: parse_date(started_on, 8)?,
        finished_on: parse_date(finished_on, 9)?,
        archived: row.get(10)?,
        updated_at: row.get(11)?,
        cover: match (
            row.get::<_, Option<String>>(12)?,
            row.get::<_, Option<String>>(13)?,
            row.get::<_, Option<u64>>(14)?,
        ) {
            (Some(file_name), Some(mime_type), Some(size_bytes)) => Some(
                ManagedReadingCover::new(file_name, mime_type, size_bytes)
                    .map_err(|_| conversion_error(12, "portada"))?,
            ),
            (None, None, None) => None,
            _ => return Err(conversion_error(12, "portada")),
        },
    })
}

fn parse_date(value: Option<String>, column: usize) -> rusqlite::Result<Option<NaiveDate>> {
    value
        .map(|date| {
            NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                .map_err(|_| conversion_error(column, "fecha"))
        })
        .transpose()
}

fn conversion_error(column: usize, field: &'static str) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        column,
        rusqlite::types::Type::Text,
        Box::new(ReadingRepositoryError::InvalidStoredValue(field)),
    )
}

pub fn status_to_str(status: ReadingStatus) -> &'static str {
    match status {
        ReadingStatus::Pending => "pending",
        ReadingStatus::Researching => "researching",
        ReadingStatus::Reading => "reading",
        ReadingStatus::Paused => "paused",
        ReadingStatus::Completed => "completed",
        ReadingStatus::Abandoned => "abandoned",
    }
}

pub fn status_from_str(value: &str) -> Option<ReadingStatus> {
    Some(match value {
        "pending" => ReadingStatus::Pending,
        "researching" => ReadingStatus::Researching,
        "reading" => ReadingStatus::Reading,
        "paused" => ReadingStatus::Paused,
        "completed" => ReadingStatus::Completed,
        "abandoned" => ReadingStatus::Abandoned,
        _ => return None,
    })
}

pub fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reading::model::BookDraft;

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!(
                "../../migrations/0017_create_reading_books.sql"
            ))
            .unwrap();
        connection
            .execute_batch(include_str!("../../migrations/0018_add_reading_covers.sql"))
            .unwrap();
        connection
    }

    fn book() -> Book {
        Book::new(
            BookId::generate(),
            BookDraft {
                title: "Dune".into(),
                author: "Frank Herbert".into(),
                genres: vec!["Ciencia ficción".into()],
                status: ReadingStatus::Reading,
                score: Some(9.0),
                opinion: None,
                favorite: true,
                started_on: None,
                finished_on: None,
            },
            Utc::now().to_rfc3339(),
        )
        .unwrap()
    }

    #[test]
    fn persists_and_requires_archive_before_delete() {
        let mut connection = database();
        let mut repository = ReadingRepository::new(&mut connection);
        let book = book();
        repository.create(&book).unwrap();
        assert_eq!(repository.list(false).unwrap().len(), 1);
        assert!(matches!(
            repository.delete(&book.id),
            Err(ReadingRepositoryError::MustBeArchived)
        ));
        repository.archive(&book.id, true).unwrap();
        repository.delete(&book.id).unwrap();
        assert!(repository.find(&book.id).unwrap().is_none());
    }
}
