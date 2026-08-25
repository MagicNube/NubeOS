use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::meals::commands::ProductDatabase;

use super::{
    cover::ReadingCoverStore,
    model::{Book, BookDraft, BookId, ReadingRun, ReadingRunId, ReadingStatus},
    repository::{normalize, ReadingRepository},
};

pub struct ReadingCoverState {
    pub store: Mutex<ReadingCoverStore>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ReadingStatusDto {
    Pending,
    Reading,
    Paused,
    Completed,
    Abandoned,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingBookInputDto {
    pub title: String,
    pub author: String,
    pub genres: Vec<String>,
    pub status: ReadingStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    pub cover_token: Option<String>,
    #[serde(default)]
    pub remove_cover: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListReadingBooksInputDto {
    #[serde(default)]
    pub archived: bool,
    pub search: Option<String>,
    pub status: Option<ReadingStatusDto>,
    pub genre: Option<String>,
    #[serde(default)]
    pub favorites_only: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingRunInputDto {
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingHistoryInputDto {
    pub book_id: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingBookDto {
    pub id: String,
    pub title: String,
    pub author: String,
    pub genres: Vec<String>,
    pub status: ReadingStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    pub archived: bool,
    pub updated_at: String,
    pub has_cover: bool,
    pub cover_position_x: f64,
    pub cover_position_y: f64,
    pub cover_zoom: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingRunDto {
    pub id: String,
    pub book_id: String,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingDetailDto {
    #[serde(flatten)]
    pub book: ReadingBookDto,
    pub runs: Vec<ReadingRunDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingHistoryEntryDto {
    pub run: ReadingRunDto,
    pub book_title: String,
    pub book_author: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingReadingCoverDto {
    pub token: String,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn select_reading_cover(
    app: AppHandle,
    state: State<'_, ReadingCoverState>,
) -> Result<Option<PendingReadingCoverDto>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Imagen de portada", &["jpg", "jpeg", "png", "webp"])
        .blocking_pick_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| "La selección no corresponde a un archivo local.".to_owned())?;
    let pending = state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?
        .prepare(&path)
        .map_err(|error| error.to_string())?;
    Ok(Some(PendingReadingCoverDto {
        token: pending.token,
        original_name: pending.original_name,
        mime_type: pending.mime_type,
        size_bytes: pending.size_bytes,
    }))
}

#[tauri::command]
pub fn prepare_pasted_reading_cover(
    state: State<'_, ReadingCoverState>,
    bytes: Vec<u8>,
) -> Result<PendingReadingCoverDto, String> {
    let pending = state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?
        .prepare_jpeg_bytes(&bytes)
        .map_err(|error| error.to_string())?;
    Ok(PendingReadingCoverDto {
        token: pending.token,
        original_name: pending.original_name,
        mime_type: pending.mime_type,
        size_bytes: pending.size_bytes,
    })
}

#[tauri::command]
pub fn discard_pending_reading_cover(
    state: State<'_, ReadingCoverState>,
    token: String,
) -> Result<(), String> {
    state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?
        .discard(&token)
        .map_err(|error| error.to_string())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingStatisticsDto {
    pub active_books: usize,
    pub currently_reading: usize,
    pub completed_books: usize,
    pub favorite_books: usize,
    pub average_score: Option<f64>,
    pub by_status: Vec<ReadingStatusCountDto>,
    pub top_genres: Vec<ReadingGenreCountDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingStatusCountDto {
    pub status: ReadingStatusDto,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingGenreCountDto {
    pub genre: String,
    pub count: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingStatisticsFilterDto {
    pub genre: Option<String>,
    pub minimum_score: Option<f64>,
}

#[tauri::command]
pub fn list_reading_books(
    database: State<'_, ProductDatabase>,
    input: ListReadingBooksInputDto,
) -> Result<Vec<ReadingBookDto>, String> {
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut books = ReadingRepository::new(&mut connection)
        .list(input.archived)
        .map_err(|error| error.to_string())?;
    let search = input
        .search
        .as_deref()
        .map(normalize)
        .filter(|value| !value.is_empty());
    let genre = input
        .genre
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    books.retain(|book| {
        search.as_ref().map_or(true, |query| {
            normalize(&book.title).contains(query) || normalize(&book.author).contains(query)
        }) && input
            .status
            .map_or(true, |status| book.status == status.into())
            && genre.map_or(true, |genre| {
                book.genres
                    .iter()
                    .any(|stored| stored.eq_ignore_ascii_case(genre))
            })
            && (!input.favorites_only || book.favorite)
    });
    Ok(books.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub fn get_reading_book(
    database: State<'_, ProductDatabase>,
    book_id: String,
) -> Result<ReadingDetailDto, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    reading_detail(database, &id)
}

#[tauri::command]
pub fn start_reading_run(
    database: State<'_, ProductDatabase>,
    book_id: String,
    started_on: String,
) -> Result<ReadingDetailDto, String> {
    create_reading_run(
        database,
        book_id,
        ReadingRunInputDto {
            started_on: Some(started_on),
            finished_on: None,
        },
    )
}

#[tauri::command]
pub fn create_reading_run(
    database: State<'_, ProductDatabase>,
    book_id: String,
    input: ReadingRunInputDto,
) -> Result<ReadingDetailDto, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let run = ReadingRun::new(
        id.clone(),
        parse_date(input.started_on)?,
        parse_date(input.finished_on)?,
        Utc::now().to_rfc3339(),
    )
    .map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    repository
        .find(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())?;
    repository
        .create_run(&run)
        .map_err(|error| error.to_string())?;
    reading_detail_from_repository(&mut repository, &id)
}

#[tauri::command]
pub fn finish_reading_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
    finished_on: String,
) -> Result<ReadingDetailDto, String> {
    let id = ReadingRunId::parse(&run_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let mut run = repository
        .find_run(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe la lectura solicitada.".to_owned())?;
    let book_id = run.book_id.clone();
    run.update(
        run.started_on,
        parse_date(Some(finished_on))?,
        Utc::now().to_rfc3339(),
    )
    .map_err(|error| error.to_string())?;
    repository
        .update_run(&run)
        .map_err(|error| error.to_string())?;
    reading_detail_from_repository(&mut repository, &book_id)
}

#[tauri::command]
pub fn update_reading_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
    input: ReadingRunInputDto,
) -> Result<ReadingDetailDto, String> {
    let id = ReadingRunId::parse(&run_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let mut run = repository
        .find_run(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe la lectura solicitada.".to_owned())?;
    let book_id = run.book_id.clone();
    run.update(
        parse_date(input.started_on)?,
        parse_date(input.finished_on)?,
        Utc::now().to_rfc3339(),
    )
    .map_err(|error| error.to_string())?;
    repository
        .update_run(&run)
        .map_err(|error| error.to_string())?;
    reading_detail_from_repository(&mut repository, &book_id)
}

#[tauri::command]
pub fn delete_reading_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
) -> Result<ReadingDetailDto, String> {
    let id = ReadingRunId::parse(&run_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let book_id = repository
        .delete_run(&id)
        .map_err(|error| error.to_string())?;
    reading_detail_from_repository(&mut repository, &book_id)
}

#[tauri::command]
pub fn list_reading_history(
    database: State<'_, ProductDatabase>,
    input: ReadingHistoryInputDto,
) -> Result<Vec<ReadingHistoryEntryDto>, String> {
    let selected = input
        .book_id
        .as_deref()
        .map(BookId::parse)
        .transpose()
        .map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let books = repository.list(false).map_err(|error| error.to_string())?;
    Ok(repository
        .all_runs()
        .map_err(|error| error.to_string())?
        .into_iter()
        .filter(|run| selected.as_ref().map_or(true, |id| id == &run.book_id))
        .filter(|run| {
            input.year.map_or(true, |year| {
                run.finished_on
                    .or(run.started_on)
                    .is_some_and(|date| date.format("%Y").to_string() == year.to_string())
            })
        })
        .filter_map(|run| {
            books
                .iter()
                .find(|book| book.id == run.book_id)
                .map(|book| ReadingHistoryEntryDto {
                    run: run.into(),
                    book_title: book.title.clone(),
                    book_author: book.author.clone(),
                })
        })
        .collect())
}

fn reading_detail(
    database: State<'_, ProductDatabase>,
    id: &BookId,
) -> Result<ReadingDetailDto, String> {
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    reading_detail_from_repository(&mut ReadingRepository::new(&mut connection), id)
}

fn reading_detail_from_repository(
    repository: &mut ReadingRepository<'_>,
    id: &BookId,
) -> Result<ReadingDetailDto, String> {
    let book = repository
        .find(id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())?;
    let runs = repository.runs_for(id).map_err(|error| error.to_string())?;
    Ok(ReadingDetailDto {
        book: book.into(),
        runs: runs.into_iter().map(Into::into).collect(),
    })
}

#[tauri::command]
pub fn create_reading_book(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, ReadingCoverState>,
    input: ReadingBookInputDto,
) -> Result<ReadingBookDto, String> {
    let cover_token = input.cover_token.clone();
    let mut book = Book::new(
        BookId::generate(),
        input.try_into()?,
        Utc::now().to_rfc3339(),
    )
    .map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut store = cover_state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?;
    if let Some(token) = cover_token.as_deref() {
        book.cover = Some(store.promote(token).map_err(|error| error.to_string())?);
    }
    if let Err(error) = ReadingRepository::new(&mut connection).create(&book) {
        if let Some(cover) = book.cover.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(error.to_string());
    }
    Ok(book.into())
}

#[tauri::command]
pub fn update_reading_book(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, ReadingCoverState>,
    book_id: String,
    input: ReadingBookInputDto,
) -> Result<ReadingBookDto, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let cover_token = input.cover_token.clone();
    let remove_cover = input.remove_cover;
    let draft: BookDraft = input.try_into()?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let mut book = repository
        .find(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())?;
    let old_cover = book.cover.clone();
    book.apply(draft, Utc::now().to_rfc3339())
        .map_err(|error| error.to_string())?;
    let mut store = cover_state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?;
    let promoted = cover_token
        .as_deref()
        .map(|token| store.promote(token).map_err(|error| error.to_string()))
        .transpose()?;
    if promoted.is_some() {
        book.cover = promoted.clone();
        book.change_cover_crop(50.0, 50.0, 1.0, Utc::now().to_rfc3339())
            .map_err(|error| error.to_string())?;
    } else if remove_cover {
        book.cover = None;
        book.change_cover_crop(50.0, 50.0, 1.0, Utc::now().to_rfc3339())
            .map_err(|error| error.to_string())?;
    }
    if let Err(error) = repository.update(&book) {
        if let Some(cover) = promoted.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(error.to_string());
    }
    if (promoted.is_some() || remove_cover) && old_cover != book.cover {
        if let Some(cover) = old_cover.as_ref() {
            let _ = store.delete(cover);
        }
    }
    Ok(book.into())
}

#[tauri::command]
pub fn set_reading_book_favorite(
    database: State<'_, ProductDatabase>,
    book_id: String,
    favorite: bool,
) -> Result<ReadingBookDto, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    repository
        .set_favorite(&id, favorite)
        .map_err(|error| error.to_string())?;
    repository
        .find(&id)
        .map_err(|error| error.to_string())?
        .map(Into::into)
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())
}

#[tauri::command]
pub fn archive_reading_book(
    database: State<'_, ProductDatabase>,
    book_id: String,
) -> Result<(), String> {
    set_archived(database, book_id, true)
}

#[tauri::command]
pub fn restore_reading_book(
    database: State<'_, ProductDatabase>,
    book_id: String,
) -> Result<(), String> {
    set_archived(database, book_id, false)
}

fn set_archived(
    database: State<'_, ProductDatabase>,
    book_id: String,
    archived: bool,
) -> Result<(), String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    ReadingRepository::new(&mut connection)
        .archive(&id, archived)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_reading_book(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, ReadingCoverState>,
    book_id: String,
) -> Result<(), String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let cover = repository
        .find(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())?
        .cover;
    repository.delete(&id).map_err(|error| error.to_string())?;
    drop(connection);
    if let Some(cover) = cover {
        cover_state
            .store
            .lock()
            .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?
            .delete(&cover)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_reading_cover(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, ReadingCoverState>,
    book_id: String,
) -> Result<tauri::ipc::Response, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let cover = ReadingRepository::new(&mut connection)
        .find(&id)
        .map_err(|error| error.to_string())?
        .and_then(|book| book.cover)
        .ok_or_else(|| "Este libro no tiene portada.".to_owned())?;
    let bytes = cover_state
        .store
        .lock()
        .map_err(|_| "No se pudo acceder al almacenamiento de portadas.".to_owned())?
        .read(&cover)
        .map_err(|error| error.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn set_reading_cover_crop(
    database: State<'_, ProductDatabase>,
    book_id: String,
    x: f64,
    y: f64,
    zoom: f64,
) -> Result<ReadingBookDto, String> {
    let id = BookId::parse(&book_id).map_err(|error| error.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut repository = ReadingRepository::new(&mut connection);
    let mut book = repository
        .find(&id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "No existe el libro solicitado.".to_owned())?;
    if book.cover.is_none() {
        return Err("Este libro no tiene portada.".to_owned());
    }
    book.change_cover_crop(x, y, zoom, Utc::now().to_rfc3339())
        .map_err(|error| error.to_string())?;
    repository
        .update(&book)
        .map_err(|error| error.to_string())?;
    Ok(book.into())
}

#[tauri::command]
pub fn get_reading_statistics(
    database: State<'_, ProductDatabase>,
    input: ReadingStatisticsFilterDto,
) -> Result<ReadingStatisticsDto, String> {
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a la base de datos.".to_owned())?;
    let mut books = ReadingRepository::new(&mut connection)
        .list(false)
        .map_err(|error| error.to_string())?;
    if let Some(genre) = input.genre.filter(|value| !value.trim().is_empty()) {
        books.retain(|book| {
            book.genres
                .iter()
                .any(|value| value.eq_ignore_ascii_case(&genre))
        });
    }
    if let Some(minimum) = input.minimum_score {
        if !(0.0..=10.0).contains(&minimum) {
            return Err("La puntuación mínima debe estar entre 0 y 10.".to_owned());
        }
        books.retain(|book| book.score.is_some_and(|score| score >= minimum));
    }
    let scored = books
        .iter()
        .filter_map(|book| book.score)
        .collect::<Vec<_>>();
    let statuses = [
        ReadingStatus::Pending,
        ReadingStatus::Reading,
        ReadingStatus::Paused,
        ReadingStatus::Completed,
        ReadingStatus::Abandoned,
    ];
    let mut genres = std::collections::BTreeMap::<String, usize>::new();
    for book in &books {
        for genre in &book.genres {
            *genres.entry(genre.clone()).or_default() += 1;
        }
    }
    let mut top_genres = genres
        .into_iter()
        .map(|(genre, count)| ReadingGenreCountDto { genre, count })
        .collect::<Vec<_>>();
    top_genres.sort_by(|left, right| {
        right
            .count
            .cmp(&left.count)
            .then_with(|| left.genre.cmp(&right.genre))
    });
    top_genres.truncate(5);
    Ok(ReadingStatisticsDto {
        active_books: books.len(),
        currently_reading: books
            .iter()
            .filter(|book| matches!(book.status, ReadingStatus::Reading | ReadingStatus::Paused))
            .count(),
        completed_books: books
            .iter()
            .filter(|book| book.status == ReadingStatus::Completed)
            .count(),
        favorite_books: books.iter().filter(|book| book.favorite).count(),
        average_score: (!scored.is_empty())
            .then(|| scored.iter().sum::<f64>() / scored.len() as f64),
        by_status: statuses
            .into_iter()
            .map(|status| ReadingStatusCountDto {
                status: status.into(),
                count: books.iter().filter(|book| book.status == status).count(),
            })
            .collect(),
        top_genres,
    })
}

impl TryFrom<ReadingBookInputDto> for BookDraft {
    type Error = String;
    fn try_from(input: ReadingBookInputDto) -> Result<Self, Self::Error> {
        Ok(Self {
            title: input.title,
            author: input.author,
            genres: input.genres,
            status: input.status.into(),
            score: input.score,
            opinion: input.opinion,
            favorite: input.favorite,
            started_on: parse_date(input.started_on)?,
            finished_on: parse_date(input.finished_on)?,
        })
    }
}

fn parse_date(value: Option<String>) -> Result<Option<NaiveDate>, String> {
    value
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            NaiveDate::parse_from_str(&value, "%Y-%m-%d")
                .map_err(|_| "La fecha no es válida.".to_owned())
        })
        .transpose()
}

impl From<ReadingStatusDto> for ReadingStatus {
    fn from(value: ReadingStatusDto) -> Self {
        match value {
            ReadingStatusDto::Pending => Self::Pending,
            ReadingStatusDto::Reading => Self::Reading,
            ReadingStatusDto::Paused => Self::Paused,
            ReadingStatusDto::Completed => Self::Completed,
            ReadingStatusDto::Abandoned => Self::Abandoned,
        }
    }
}

impl From<ReadingStatus> for ReadingStatusDto {
    fn from(value: ReadingStatus) -> Self {
        match value {
            ReadingStatus::Pending => Self::Pending,
            ReadingStatus::Reading => Self::Reading,
            ReadingStatus::Paused => Self::Paused,
            ReadingStatus::Completed => Self::Completed,
            ReadingStatus::Abandoned => Self::Abandoned,
        }
    }
}

impl From<Book> for ReadingBookDto {
    fn from(book: Book) -> Self {
        Self {
            id: book.id.as_str().to_owned(),
            title: book.title,
            author: book.author,
            genres: book.genres,
            status: book.status.into(),
            score: book.score,
            opinion: book.opinion,
            favorite: book.favorite,
            started_on: book.started_on.map(|date| date.to_string()),
            finished_on: book.finished_on.map(|date| date.to_string()),
            archived: book.archived,
            updated_at: book.updated_at,
            has_cover: book.cover.is_some(),
            cover_position_x: book.cover_position_x,
            cover_position_y: book.cover_position_y,
            cover_zoom: book.cover_zoom,
        }
    }
}

impl From<ReadingRun> for ReadingRunDto {
    fn from(run: ReadingRun) -> Self {
        Self {
            id: run.id.as_str().into(),
            book_id: run.book_id.as_str().into(),
            started_on: run.started_on.map(|date| date.to_string()),
            finished_on: run.finished_on.map(|date| date.to_string()),
        }
    }
}
