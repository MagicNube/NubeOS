//! Frontera Tauri del seguimiento audiovisual.

use std::sync::Mutex;

use chrono::{Datelike, NaiveDate, Utc};
use chrono_tz::Europe::Madrid;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::meals::commands::ProductDatabase;

use super::{
    cover::CoverStore,
    model::{
        CanonStatus, ContentKind, MediaArea, MediaContent, MediaContentDraft, MediaContentId,
        MediaError, MediaKind, MediaTitle, MediaTitleDraft, MediaTitleId, SessionSource,
        TrackingStatus,
    },
    repository::{normalize, MediaHistoryEntry, MediaRepository, MediaRepositoryError},
    service::{
        build_statistics, can_increment_content, content_score_average, next_content, progress_for,
        studios_for, suggested_title_status, validate_content_parent, validate_progress_change,
        MediaAggregate,
    },
};

pub struct MediaCoverState {
    pub store: Mutex<CoverStore>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MediaKindDto {
    Anime,
    Series,
    Movie,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MediaAreaDto {
    Anime,
    Series,
    Movies,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TrackingStatusDto {
    Watching,
    Pending,
    Paused,
    Completed,
    Dropped,
    WaitingContent,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ContentKindDto {
    Season,
    Movie,
    Ova,
    Special,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CanonStatusDto {
    Canon,
    Recommended,
    Optional,
    Omitted,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProgressTargetDto {
    Title,
    Content,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SessionSourceDto {
    QuickAdd,
    ManualAdjustment,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTitleInputDto {
    pub name: String,
    pub alternative_title: Option<String>,
    #[serde(default)]
    pub genres: Vec<String>,
    pub kind: MediaKindDto,
    pub is_anime: bool,
    pub status: TrackingStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    pub current_season: Option<u32>,
    pub current_episode: Option<u32>,
    pub cover_token: Option<String>,
    #[serde(default)]
    pub remove_cover: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaContentInputDto {
    pub name: String,
    pub kind: ContentKindDto,
    pub status: TrackingStatusDto,
    pub canon_status: CanonStatusDto,
    pub total_episodes: Option<u32>,
    pub studio: Option<String>,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub notes: Option<String>,
    pub started_on: Option<String>,
    pub released_on: Option<String>,
    pub finished_on: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListMediaTitlesInputDto {
    #[serde(default)]
    pub archived: bool,
    pub search: Option<String>,
    pub kind: Option<MediaKindDto>,
    pub area: Option<MediaAreaDto>,
    pub status: Option<TrackingStatusDto>,
    pub studio: Option<String>,
    #[serde(default)]
    pub favorites_only: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListMediaHistoryInputDto {
    pub area: Option<MediaAreaDto>,
    pub year: Option<i32>,
    pub month: Option<u32>,
    pub title_id: Option<String>,
    pub content_id: Option<String>,
    #[serde(default)]
    pub oldest_first: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetMediaProgressInputDto {
    pub target_type: ProgressTargetDto,
    pub target_id: String,
    pub watched: u32,
    pub watched_on: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncrementMediaProgressInputDto {
    pub target_type: ProgressTargetDto,
    pub target_id: String,
    pub watched_on: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingCoverDto {
    pub token: String,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressDto {
    pub watched: u32,
    pub total: Option<u32>,
    pub total_incomplete: bool,
    pub percentage: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NextContentDto {
    pub id: String,
    pub name: String,
    pub watched: u32,
    pub total: Option<u32>,
    pub can_increment: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTitleDto {
    pub id: String,
    pub catalog_number: Option<u32>,
    pub name: String,
    pub alternative_title: Option<String>,
    pub genres: Vec<String>,
    pub kind: MediaKindDto,
    pub is_anime: bool,
    pub status: TrackingStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub archived: bool,
    pub has_cover: bool,
    pub watched_units: u32,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    pub current_season: Option<u32>,
    pub current_episode: Option<u32>,
    pub progress: ProgressDto,
    pub contents_count: usize,
    pub average_content_score: Option<f64>,
    pub next_content: Option<NextContentDto>,
    pub studios: Vec<String>,
    pub suggested_status: Option<TrackingStatusDto>,
    pub first_activity_on: Option<String>,
    pub last_activity_on: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaContentDto {
    pub id: String,
    pub title_id: String,
    pub name: String,
    pub kind: ContentKindDto,
    pub status: TrackingStatusDto,
    pub canon_status: CanonStatusDto,
    pub total_episodes: Option<u32>,
    pub effective_total: Option<u32>,
    pub watched_episodes: u32,
    pub studio: Option<String>,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub notes: Option<String>,
    pub started_on: Option<String>,
    pub released_on: Option<String>,
    pub finished_on: Option<String>,
    pub position: u32,
    pub can_increment: bool,
    pub first_activity_on: Option<String>,
    pub last_activity_on: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchSessionDto {
    pub id: String,
    pub content_id: Option<String>,
    pub content_name: Option<String>,
    pub watched_on: String,
    pub episode_number: u32,
    pub source: SessionSourceDto,
    pub can_delete: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaHistoryEntryDto {
    pub id: String,
    pub title_id: String,
    pub title_name: String,
    pub title_kind: MediaKindDto,
    pub content_id: Option<String>,
    pub content_name: Option<String>,
    pub content_kind: Option<ContentKindDto>,
    pub watched_on: String,
    pub episode_number: u32,
    pub can_delete: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDetailDto {
    pub title: MediaTitleDto,
    pub contents: Vec<MediaContentDto>,
    pub sessions: Vec<WatchSessionDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaStatusCountDto {
    pub status: TrackingStatusDto,
    pub count: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopMediaTitleDto {
    pub id: String,
    pub name: String,
    pub score: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaStatisticsDto {
    pub active_titles: u32,
    pub anime_titles: u32,
    pub series_titles: u32,
    pub movie_titles: u32,
    pub watched_episodes: u32,
    pub completed_movies: u32,
    pub sessions: u32,
    pub average_score: Option<f64>,
    pub by_status: Vec<MediaStatusCountDto>,
    pub top_titles: Vec<TopMediaTitleDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaCommandErrorDto {
    pub code: &'static str,
    pub message: String,
}

#[tauri::command]
pub async fn select_media_cover(
    app: AppHandle,
    state: State<'_, MediaCoverState>,
) -> Result<Option<PendingCoverDto>, MediaCommandErrorDto> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Imagen de portada", &["jpg", "jpeg", "png", "webp", "gif"])
        .blocking_pick_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|_| {
        error(
            "invalidCover",
            "La selección no corresponde a un archivo local.",
        )
    })?;
    let pending = state
        .store
        .lock()
        .map_err(|_| unavailable())?
        .prepare(&path)
        .map_err(|reason| error("invalidCover", reason.to_string()))?;
    Ok(Some(PendingCoverDto {
        token: pending.token,
        original_name: pending.original_name,
        mime_type: pending.mime_type,
        size_bytes: pending.size_bytes,
    }))
}

#[tauri::command]
pub fn discard_pending_media_cover(
    state: State<'_, MediaCoverState>,
    token: String,
) -> Result<(), MediaCommandErrorDto> {
    state
        .store
        .lock()
        .map_err(|_| unavailable())?
        .discard(&token)
        .map_err(|reason| error("invalidCover", reason.to_string()))
}

#[tauri::command]
pub fn list_media_titles(
    database: State<'_, ProductDatabase>,
    input: ListMediaTitlesInputDto,
) -> Result<Vec<MediaTitleDto>, MediaCommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut aggregates = MediaRepository::new(&mut connection)
        .list_aggregates()
        .map_err(repository_error)?;
    let search = input
        .search
        .as_deref()
        .map(normalize)
        .filter(|value| !value.is_empty());
    let studio = input
        .studio
        .as_deref()
        .map(normalize)
        .filter(|value| !value.is_empty());
    aggregates.retain(|aggregate| {
        aggregate.title.archived == input.archived
            && input
                .kind
                .map(media_kind_from_dto)
                .map_or(true, |kind| aggregate.title.kind == kind)
            && input
                .area
                .map(media_area_from_dto)
                .map_or(true, |area| aggregate.title.belongs_to(area))
            && input
                .status
                .map(status_from_dto)
                .map_or(true, |status| aggregate.title.status == status)
            && (!input.favorites_only || aggregate.title.favorite)
            && studio.as_ref().map_or(true, |needle| {
                aggregate.contents.iter().any(|content| {
                    content
                        .studio
                        .as_deref()
                        .is_some_and(|value| normalize(value) == *needle)
                })
            })
            && search.as_ref().map_or(true, |needle| {
                normalize(&aggregate.title.name).contains(needle)
                    || aggregate
                        .title
                        .alternative_title
                        .as_deref()
                        .is_some_and(|name| normalize(name).contains(needle))
            })
    });
    Ok(aggregates.iter().map(title_to_dto).collect())
}

#[tauri::command]
pub fn get_media_title(
    database: State<'_, ProductDatabase>,
    title_id: String,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let aggregate = MediaRepository::new(&mut connection)
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn set_media_title_status(
    database: State<'_, ProductDatabase>,
    title_id: String,
    status: TrackingStatusDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let mut title = repository
        .find_title(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let next_status = status_from_dto(status);
    if title.kind == MediaKind::Movie {
        let watched = u32::from(next_status == TrackingStatus::Completed);
        if watched != title.watched_units {
            repository
                .set_title_progress(
                    &id,
                    watched,
                    madrid_today(),
                    SessionSource::ManualAdjustment,
                )
                .map_err(repository_error)?;
            title = repository
                .find_title(&id)
                .map_err(repository_error)?
                .ok_or_else(not_found)?;
        }
    }
    title.change_status(next_status);
    repository.update_title(&title).map_err(repository_error)?;
    let aggregate = repository
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn set_media_title_score(
    database: State<'_, ProductDatabase>,
    title_id: String,
    score: Option<f64>,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let mut title = repository
        .find_title(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    title.change_score(score).map_err(domain_error)?;
    repository.update_title(&title).map_err(repository_error)?;
    let aggregate = repository
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn set_media_title_favorite(
    database: State<'_, ProductDatabase>,
    title_id: String,
    favorite: bool,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let mut title = repository
        .find_title(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    title.change_favorite(favorite);
    repository.update_title(&title).map_err(repository_error)?;
    let aggregate = repository
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn list_media_studios(
    database: State<'_, ProductDatabase>,
) -> Result<Vec<String>, MediaCommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    MediaRepository::new(&mut connection)
        .list_studios()
        .map_err(repository_error)
}

#[tauri::command]
pub fn list_media_history(
    database: State<'_, ProductDatabase>,
    input: ListMediaHistoryInputDto,
) -> Result<Vec<MediaHistoryEntryDto>, MediaCommandErrorDto> {
    let title_id = input.title_id.as_deref().map(parse_title_id).transpose()?;
    let content_id = input.content_id.map(parse_content_id).transpose()?;
    if input.month.is_some_and(|month| !(1..=12).contains(&month)) {
        return Err(error("validation", "El mes debe estar entre 1 y 12."));
    }
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut entries = MediaRepository::new(&mut connection)
        .list_history()
        .map_err(repository_error)?;
    entries.retain(|entry| {
        input
            .area
            .map(media_area_from_dto)
            .map_or(true, |area| match area {
                MediaArea::Anime => entry.is_anime,
                MediaArea::Series => entry.title_kind == MediaKind::Series && !entry.is_anime,
                MediaArea::Movies => entry.title_kind == MediaKind::Movie && !entry.is_anime,
            })
            && input
                .year
                .map_or(true, |year| entry.watched_on.year() == year)
            && input
                .month
                .map_or(true, |month| entry.watched_on.month() == month)
            && title_id.as_ref().map_or(true, |id| entry.title_id == *id)
            && content_id
                .as_ref()
                .map_or(true, |id| entry.content_id.as_ref() == Some(id))
    });
    if input.oldest_first {
        entries.reverse();
    }
    Ok(entries.iter().map(history_to_dto).collect())
}

#[tauri::command]
pub fn update_media_history_date(
    database: State<'_, ProductDatabase>,
    session_id: String,
    watched_on: String,
) -> Result<(), MediaCommandErrorDto> {
    let date = parse_date(&watched_on)?;
    if date > madrid_today() {
        return Err(domain_error(MediaError::FutureSession));
    }
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    MediaRepository::new(&mut connection)
        .update_session_date(&session_id, date)
        .map_err(repository_error)
}

#[tauri::command]
pub fn delete_media_history_entry(
    database: State<'_, ProductDatabase>,
    session_id: String,
) -> Result<(), MediaCommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    MediaRepository::new(&mut connection)
        .delete_latest_session(&session_id)
        .map_err(repository_error)
}

#[tauri::command]
pub fn create_media_title(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, MediaCoverState>,
    input: MediaTitleInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let cover_token = input.cover_token.clone();
    let mut title =
        MediaTitle::new(MediaTitleId::generate(), title_draft(input)?).map_err(domain_error)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    if title.is_anime && title.kind == MediaKind::Anime {
        let number = repository
            .next_anime_catalog_number()
            .map_err(repository_error)?;
        title.assign_catalog_number(number).map_err(domain_error)?;
    }
    let mut store = cover_state.store.lock().map_err(|_| unavailable())?;
    if let Some(token) = cover_token.as_deref() {
        title.cover = Some(
            store
                .promote(token)
                .map_err(|reason| error("invalidCover", reason.to_string()))?,
        );
    }
    let result = repository.create_title(&title);
    if let Err(reason) = result {
        if let Some(cover) = title.cover.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(repository_error(reason));
    }
    Ok(detail_to_dto(&MediaAggregate {
        title,
        contents: vec![],
        sessions: vec![],
    }))
}

#[tauri::command]
pub fn update_media_title(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, MediaCoverState>,
    title_id: String,
    input: MediaTitleInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let aggregate = repository
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let mut title = aggregate.title;
    let old_cover = title.cover.clone();
    let cover_token = input.cover_token.clone();
    let remove_cover = input.remove_cover;
    title.apply(title_draft(input)?).map_err(domain_error)?;
    if title.kind != MediaKind::Anime && !aggregate.contents.is_empty() {
        return Err(domain_error(MediaError::TitleCannotHaveContents));
    }
    if title.kind == MediaKind::Anime && title.is_anime && title.catalog_number.is_none() {
        let number = repository
            .next_anime_catalog_number()
            .map_err(repository_error)?;
        title.assign_catalog_number(number).map_err(domain_error)?;
    } else if title.kind != MediaKind::Anime {
        title.clear_catalog_number();
    }
    let mut store = cover_state.store.lock().map_err(|_| unavailable())?;
    let promoted = cover_token
        .as_deref()
        .map(|token| {
            store
                .promote(token)
                .map_err(|reason| error("invalidCover", reason.to_string()))
        })
        .transpose()?;
    if promoted.is_some() {
        title.cover = promoted.clone();
    } else if remove_cover {
        title.cover = None;
    }
    if let Err(reason) = repository.update_title(&title) {
        if let Some(cover) = promoted.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(repository_error(reason));
    }
    if (promoted.is_some() || remove_cover) && old_cover != title.cover {
        if let Some(cover) = old_cover.as_ref() {
            let _ = store.delete(cover);
        }
    }
    let aggregate = repository
        .find_aggregate(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn create_media_content(
    database: State<'_, ProductDatabase>,
    title_id: String,
    input: MediaContentInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let title_id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let title = repository
        .find_title(&title_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let position = repository
        .next_content_position(&title_id)
        .map_err(repository_error)?;
    let content = MediaContent::new(
        MediaContentId::generate(),
        title_id.clone(),
        content_draft(input, 0)?,
        position,
    )
    .map_err(domain_error)?;
    validate_content_parent(&title, &content).map_err(domain_error)?;
    repository
        .create_content(&content)
        .map_err(repository_error)?;
    let aggregate = repository
        .find_aggregate(&title_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn update_media_content(
    database: State<'_, ProductDatabase>,
    content_id: String,
    input: MediaContentInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let content_id = parse_content_id(&content_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let mut content = repository
        .find_content(&content_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let watched_episodes = content.watched_episodes;
    content
        .apply(content_draft(input, watched_episodes)?)
        .map_err(domain_error)?;
    repository
        .update_content(&content)
        .map_err(repository_error)?;
    let aggregate = repository
        .find_aggregate(&content.title_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn delete_media_content(
    database: State<'_, ProductDatabase>,
    content_id: String,
) -> Result<(), MediaCommandErrorDto> {
    let content_id = parse_content_id(&content_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    MediaRepository::new(&mut connection)
        .delete_content(&content_id)
        .map_err(repository_error)
}

#[tauri::command]
pub fn reorder_media_contents(
    database: State<'_, ProductDatabase>,
    title_id: String,
    content_ids: Vec<String>,
) -> Result<(), MediaCommandErrorDto> {
    let title_id = parse_title_id(&title_id)?;
    let ids = content_ids
        .into_iter()
        .map(parse_content_id)
        .collect::<Result<Vec<_>, _>>()?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    MediaRepository::new(&mut connection)
        .reorder_contents(&title_id, &ids)
        .map_err(repository_error)
}

#[tauri::command]
pub fn set_media_progress(
    database: State<'_, ProductDatabase>,
    input: SetMediaProgressInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    change_progress(
        &database,
        input.target_type,
        &input.target_id,
        input.watched,
        parse_date(&input.watched_on)?,
        SessionSource::ManualAdjustment,
    )
}

#[tauri::command]
pub fn increment_media_progress(
    database: State<'_, ProductDatabase>,
    input: IncrementMediaProgressInputDto,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let date = parse_date(&input.watched_on)?;
    let today = madrid_today();
    if date > today {
        return Err(domain_error(MediaError::FutureSession));
    }
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let title_id = match input.target_type {
        ProgressTargetDto::Title => {
            let id = parse_title_id(&input.target_id)?;
            let title = repository
                .find_title(&id)
                .map_err(repository_error)?
                .ok_or_else(not_found)?;
            if title.kind != MediaKind::Movie
                || title.watched_units >= 1
                || matches!(
                    title.status,
                    TrackingStatus::Dropped | TrackingStatus::WaitingContent
                )
            {
                return Err(domain_error(MediaError::CannotIncrement));
            }
            repository
                .set_title_progress(&id, title.watched_units + 1, date, SessionSource::QuickAdd)
                .map_err(repository_error)?;
            id
        }
        ProgressTargetDto::Content => {
            let id = parse_content_id(&input.target_id)?;
            let content = repository
                .find_content(&id)
                .map_err(repository_error)?
                .ok_or_else(not_found)?;
            if !can_increment_content(&content) {
                return Err(domain_error(MediaError::CannotIncrement));
            }
            let title_id = content.title_id.clone();
            repository
                .set_content_progress(
                    &id,
                    content.watched_episodes + 1,
                    date,
                    SessionSource::QuickAdd,
                )
                .map_err(repository_error)?;
            title_id
        }
    };
    let aggregate = repository
        .find_aggregate(&title_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

#[tauri::command]
pub fn archive_media_title(
    database: State<'_, ProductDatabase>,
    title_id: String,
) -> Result<(), MediaCommandErrorDto> {
    lifecycle(&database, &title_id, true)
}

#[tauri::command]
pub fn restore_media_title(
    database: State<'_, ProductDatabase>,
    title_id: String,
) -> Result<(), MediaCommandErrorDto> {
    lifecycle(&database, &title_id, false)
}

#[tauri::command]
pub fn delete_media_title(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, MediaCoverState>,
    title_id: String,
) -> Result<(), MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let cover = MediaRepository::new(&mut connection)
        .delete_archived_title(&id)
        .map_err(repository_error)?;
    if let Some(cover) = cover {
        // SQLite ya es la fuente de verdad y el borrado es irreversible en este punto.
        // Un fallo excepcional de limpieza no debe comunicar que el título sigue existiendo.
        if let Ok(store) = cover_state.store.lock() {
            let _ = store.delete(&cover);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_media_cover(
    database: State<'_, ProductDatabase>,
    cover_state: State<'_, MediaCoverState>,
    title_id: String,
) -> Result<tauri::ipc::Response, MediaCommandErrorDto> {
    let id = parse_title_id(&title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let title = MediaRepository::new(&mut connection)
        .find_title(&id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    let cover = title
        .cover
        .ok_or_else(|| error("coverMissing", "Este título no tiene portada."))?;
    let bytes = cover_state
        .store
        .lock()
        .map_err(|_| unavailable())?
        .read(&cover)
        .map_err(|reason| error("coverMissing", reason.to_string()))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn get_media_statistics(
    database: State<'_, ProductDatabase>,
    area: Option<MediaAreaDto>,
) -> Result<MediaStatisticsDto, MediaCommandErrorDto> {
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut aggregates = MediaRepository::new(&mut connection)
        .list_aggregates()
        .map_err(repository_error)?;
    if let Some(area) = area {
        let area = media_area_from_dto(area);
        aggregates.retain(|aggregate| aggregate.title.belongs_to(area));
    }
    let statistics = build_statistics(&aggregates);
    Ok(MediaStatisticsDto {
        active_titles: statistics.active_titles,
        anime_titles: statistics.anime_titles,
        series_titles: statistics.series_titles,
        movie_titles: statistics.movie_titles,
        watched_episodes: statistics.watched_episodes,
        completed_movies: statistics.completed_movies,
        sessions: statistics.sessions,
        average_score: statistics.average_score,
        by_status: statistics
            .by_status
            .into_iter()
            .map(|(status, count)| MediaStatusCountDto {
                status: status_to_dto(status),
                count,
            })
            .collect(),
        top_titles: statistics
            .top_titles
            .into_iter()
            .map(|(id, name, score)| TopMediaTitleDto { id, name, score })
            .collect(),
    })
}

fn change_progress(
    database: &State<'_, ProductDatabase>,
    target_type: ProgressTargetDto,
    target_id: &str,
    next: u32,
    date: NaiveDate,
    source: SessionSource,
) -> Result<MediaDetailDto, MediaCommandErrorDto> {
    let today = madrid_today();
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    let title_id = match target_type {
        ProgressTargetDto::Title => {
            let id = parse_title_id(target_id)?;
            let title = repository
                .find_title(&id)
                .map_err(repository_error)?
                .ok_or_else(not_found)?;
            if title.kind != MediaKind::Movie {
                return Err(error(
                    "validation",
                    "Solo una película independiente usa progreso directo.",
                ));
            }
            validate_progress_change(title.watched_units, next, Some(1), date, today)
                .map_err(domain_error)?;
            repository
                .set_title_progress(&id, next, date, source)
                .map_err(repository_error)?;
            id
        }
        ProgressTargetDto::Content => {
            let id = parse_content_id(target_id)?;
            let content = repository
                .find_content(&id)
                .map_err(repository_error)?
                .ok_or_else(not_found)?;
            validate_progress_change(
                content.watched_episodes,
                next,
                content.effective_total(),
                date,
                today,
            )
            .map_err(domain_error)?;
            let title_id = content.title_id.clone();
            repository
                .set_content_progress(&id, next, date, source)
                .map_err(repository_error)?;
            title_id
        }
    };
    let aggregate = repository
        .find_aggregate(&title_id)
        .map_err(repository_error)?
        .ok_or_else(not_found)?;
    Ok(detail_to_dto(&aggregate))
}

fn lifecycle(
    database: &State<'_, ProductDatabase>,
    title_id: &str,
    archive: bool,
) -> Result<(), MediaCommandErrorDto> {
    let id = parse_title_id(title_id)?;
    let mut connection = database.connection.lock().map_err(|_| unavailable())?;
    let mut repository = MediaRepository::new(&mut connection);
    if archive {
        repository.archive_title(&id)
    } else {
        repository.restore_title(&id)
    }
    .map_err(repository_error)
}

fn title_draft(input: MediaTitleInputDto) -> Result<MediaTitleDraft, MediaCommandErrorDto> {
    Ok(MediaTitleDraft {
        name: input.name,
        alternative_title: input.alternative_title,
        genres: input.genres,
        kind: media_kind_from_dto(input.kind),
        is_anime: input.is_anime,
        status: status_from_dto(input.status),
        score: input.score,
        opinion: input.opinion,
        favorite: input.favorite,
        started_on: input.started_on.as_deref().map(parse_date).transpose()?,
        finished_on: input.finished_on.as_deref().map(parse_date).transpose()?,
        current_season: input.current_season,
        current_episode: input.current_episode,
    })
}

fn content_draft(
    input: MediaContentInputDto,
    watched_episodes: u32,
) -> Result<MediaContentDraft, MediaCommandErrorDto> {
    Ok(MediaContentDraft {
        name: input.name,
        kind: content_kind_from_dto(input.kind),
        status: status_from_dto(input.status),
        canon_status: canon_from_dto(input.canon_status),
        total_episodes: input.total_episodes,
        watched_episodes,
        studio: input.studio,
        score: input.score,
        opinion: input.opinion,
        notes: input.notes,
        started_on: input.started_on.as_deref().map(parse_date).transpose()?,
        released_on: input.released_on.as_deref().map(parse_date).transpose()?,
        finished_on: input.finished_on.as_deref().map(parse_date).transpose()?,
    })
}

fn title_to_dto(aggregate: &MediaAggregate) -> MediaTitleDto {
    let progress = progress_for(aggregate);
    let first_activity = aggregate
        .sessions
        .iter()
        .map(|session| session.watched_on)
        .min();
    let last_activity = aggregate
        .sessions
        .iter()
        .map(|session| session.watched_on)
        .max();
    MediaTitleDto {
        id: aggregate.title.id.as_str().to_owned(),
        catalog_number: aggregate.title.catalog_number,
        name: aggregate.title.name.clone(),
        alternative_title: aggregate.title.alternative_title.clone(),
        genres: aggregate.title.genres.clone(),
        kind: media_kind_to_dto(aggregate.title.kind),
        is_anime: aggregate.title.is_anime,
        status: status_to_dto(aggregate.title.status),
        score: aggregate.title.score,
        opinion: aggregate.title.opinion.clone(),
        favorite: aggregate.title.favorite,
        archived: aggregate.title.archived,
        has_cover: aggregate.title.cover.is_some(),
        watched_units: aggregate.title.watched_units,
        started_on: aggregate.title.started_on.map(|date| date.to_string()),
        finished_on: aggregate.title.finished_on.map(|date| date.to_string()),
        current_season: aggregate.title.current_season,
        current_episode: aggregate.title.current_episode,
        progress: ProgressDto {
            watched: progress.watched,
            total: progress.total,
            total_incomplete: progress.total_incomplete,
            percentage: progress.percentage,
        },
        contents_count: aggregate.contents.len(),
        average_content_score: content_score_average(&aggregate.contents),
        next_content: next_content(aggregate).map(|content| NextContentDto {
            id: content.id.as_str().to_owned(),
            name: content.name.clone(),
            watched: content.watched_episodes,
            total: content.effective_total(),
            can_increment: can_increment_content(content),
        }),
        studios: studios_for(aggregate),
        suggested_status: suggested_title_status(aggregate).map(status_to_dto),
        first_activity_on: first_activity.map(|date| date.to_string()),
        last_activity_on: last_activity.map(|date| date.to_string()),
    }
}

fn detail_to_dto(aggregate: &MediaAggregate) -> MediaDetailDto {
    MediaDetailDto {
        title: title_to_dto(aggregate),
        contents: aggregate
            .contents
            .iter()
            .map(|content| content_to_dto(content, &aggregate.sessions))
            .collect(),
        sessions: aggregate
            .sessions
            .iter()
            .filter_map(|session| {
                session
                    .episode_number
                    .map(|episode_number| (session, episode_number))
            })
            .map(|(session, episode_number)| WatchSessionDto {
                id: session.id.clone(),
                content_id: session.content_id.as_ref().map(|id| id.as_str().to_owned()),
                content_name: session
                    .content_id
                    .as_ref()
                    .and_then(|id| aggregate.contents.iter().find(|content| content.id == *id))
                    .map(|content| content.name.clone()),
                watched_on: session.watched_on.to_string(),
                episode_number,
                source: match session.source {
                    SessionSource::QuickAdd => SessionSourceDto::QuickAdd,
                    SessionSource::ManualAdjustment => SessionSourceDto::ManualAdjustment,
                },
                can_delete: session.content_id.as_ref().map_or(
                    aggregate.title.watched_units == episode_number,
                    |id| {
                        aggregate.contents.iter().any(|content| {
                            content.id == *id && content.watched_episodes == episode_number
                        })
                    },
                ),
            })
            .collect(),
    }
}

fn content_to_dto(
    content: &MediaContent,
    sessions: &[super::model::WatchSession],
) -> MediaContentDto {
    let activity = sessions
        .iter()
        .filter(|session| session.content_id.as_ref() == Some(&content.id));
    let first_activity = activity.clone().map(|session| session.watched_on).min();
    let last_activity = activity.map(|session| session.watched_on).max();
    MediaContentDto {
        id: content.id.as_str().to_owned(),
        title_id: content.title_id.as_str().to_owned(),
        name: content.name.clone(),
        kind: content_kind_to_dto(content.kind),
        status: status_to_dto(content.status),
        canon_status: canon_to_dto(content.canon_status),
        total_episodes: content.total_episodes,
        effective_total: content.effective_total(),
        watched_episodes: content.watched_episodes,
        studio: content.studio.clone(),
        score: content.score,
        opinion: content.opinion.clone(),
        notes: content.notes.clone(),
        started_on: content.started_on.map(|date| date.to_string()),
        released_on: content.released_on.map(|date| date.to_string()),
        finished_on: content.finished_on.map(|date| date.to_string()),
        position: content.position,
        can_increment: can_increment_content(content),
        first_activity_on: first_activity.map(|date| date.to_string()),
        last_activity_on: last_activity.map(|date| date.to_string()),
    }
}

fn history_to_dto(entry: &MediaHistoryEntry) -> MediaHistoryEntryDto {
    MediaHistoryEntryDto {
        id: entry.id.clone(),
        title_id: entry.title_id.as_str().to_owned(),
        title_name: entry.title_name.clone(),
        title_kind: media_kind_to_dto(entry.title_kind),
        content_id: entry.content_id.as_ref().map(|id| id.as_str().to_owned()),
        content_name: entry.content_name.clone(),
        content_kind: entry.content_kind.map(content_kind_to_dto),
        watched_on: entry.watched_on.to_string(),
        episode_number: entry.episode_number,
        can_delete: entry.can_delete,
    }
}

fn parse_title_id(value: &str) -> Result<MediaTitleId, MediaCommandErrorDto> {
    MediaTitleId::new(value).map_err(domain_error)
}
fn parse_content_id(value: impl Into<String>) -> Result<MediaContentId, MediaCommandErrorDto> {
    MediaContentId::new(value).map_err(domain_error)
}
fn parse_date(value: &str) -> Result<NaiveDate, MediaCommandErrorDto> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| error("validation", "La fecha debe usar el formato AAAA-MM-DD."))
}
fn madrid_today() -> NaiveDate {
    let now = Utc::now().with_timezone(&Madrid);
    NaiveDate::from_ymd_opt(now.year(), now.month(), now.day()).expect("fecha de chrono válida")
}

fn media_kind_from_dto(value: MediaKindDto) -> MediaKind {
    match value {
        MediaKindDto::Anime => MediaKind::Anime,
        MediaKindDto::Series => MediaKind::Series,
        MediaKindDto::Movie => MediaKind::Movie,
    }
}
fn media_kind_to_dto(value: MediaKind) -> MediaKindDto {
    match value {
        MediaKind::Anime => MediaKindDto::Anime,
        MediaKind::Series => MediaKindDto::Series,
        MediaKind::Movie => MediaKindDto::Movie,
    }
}

fn media_area_from_dto(area: MediaAreaDto) -> MediaArea {
    match area {
        MediaAreaDto::Anime => MediaArea::Anime,
        MediaAreaDto::Series => MediaArea::Series,
        MediaAreaDto::Movies => MediaArea::Movies,
    }
}
fn status_from_dto(value: TrackingStatusDto) -> TrackingStatus {
    match value {
        TrackingStatusDto::Watching => TrackingStatus::Watching,
        TrackingStatusDto::Pending => TrackingStatus::Pending,
        TrackingStatusDto::Paused => TrackingStatus::Paused,
        TrackingStatusDto::Completed => TrackingStatus::Completed,
        TrackingStatusDto::Dropped => TrackingStatus::Dropped,
        TrackingStatusDto::WaitingContent => TrackingStatus::WaitingContent,
    }
}
fn status_to_dto(value: TrackingStatus) -> TrackingStatusDto {
    match value {
        TrackingStatus::Watching => TrackingStatusDto::Watching,
        TrackingStatus::Pending => TrackingStatusDto::Pending,
        TrackingStatus::Paused => TrackingStatusDto::Paused,
        TrackingStatus::Completed => TrackingStatusDto::Completed,
        TrackingStatus::Dropped => TrackingStatusDto::Dropped,
        TrackingStatus::WaitingContent => TrackingStatusDto::WaitingContent,
    }
}
fn content_kind_from_dto(value: ContentKindDto) -> ContentKind {
    match value {
        ContentKindDto::Season => ContentKind::Season,
        ContentKindDto::Movie => ContentKind::Movie,
        ContentKindDto::Ova => ContentKind::Ova,
        ContentKindDto::Special => ContentKind::Special,
    }
}
fn content_kind_to_dto(value: ContentKind) -> ContentKindDto {
    match value {
        ContentKind::Season => ContentKindDto::Season,
        ContentKind::Movie => ContentKindDto::Movie,
        ContentKind::Ova => ContentKindDto::Ova,
        ContentKind::Special => ContentKindDto::Special,
    }
}
fn canon_from_dto(value: CanonStatusDto) -> CanonStatus {
    match value {
        CanonStatusDto::Canon => CanonStatus::Canon,
        CanonStatusDto::Recommended => CanonStatus::Recommended,
        CanonStatusDto::Optional => CanonStatus::Optional,
        CanonStatusDto::Omitted => CanonStatus::Omitted,
    }
}
fn canon_to_dto(value: CanonStatus) -> CanonStatusDto {
    match value {
        CanonStatus::Canon => CanonStatusDto::Canon,
        CanonStatus::Recommended => CanonStatusDto::Recommended,
        CanonStatus::Optional => CanonStatusDto::Optional,
        CanonStatus::Omitted => CanonStatusDto::Omitted,
    }
}

fn repository_error(reason: MediaRepositoryError) -> MediaCommandErrorDto {
    error("repository", reason.to_string())
}
fn domain_error(reason: MediaError) -> MediaCommandErrorDto {
    error("validation", reason.to_string())
}
fn not_found() -> MediaCommandErrorDto {
    error("notFound", "No existe el título o contenido solicitado.")
}
fn unavailable() -> MediaCommandErrorDto {
    error("internal", "No se ha podido acceder a Series.")
}
fn error(code: &'static str, message: impl Into<String>) -> MediaCommandErrorDto {
    MediaCommandErrorDto {
        code,
        message: message.into(),
    }
}
