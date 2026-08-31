use std::sync::Mutex;

use chrono::{Datelike, NaiveDate, Utc};
use chrono_tz::Europe::Madrid;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use super::{
    cover::GameCoverStore,
    model::{Game, GameDraft, GameId, GameRun, GameRunId, GameStatus},
    repository::{normalize, GameRepository},
};
use crate::meals::commands::ProductDatabase;

pub struct GameCoverState {
    pub store: Mutex<GameCoverStore>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GameStatusDto {
    Pending,
    Playing,
    Paused,
    Completed,
    Abandoned,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInputDto {
    pub name: String,
    #[serde(default)]
    pub genres: Vec<String>,
    pub status: GameStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub cover_token: Option<String>,
    #[serde(default)]
    pub remove_cover: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGamesInputDto {
    #[serde(default)]
    pub archived: bool,
    pub search: Option<String>,
    pub status: Option<GameStatusDto>,
    #[serde(default)]
    pub favorites_only: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRunInputDto {
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    #[serde(default)]
    pub completed: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHistoryInputDto {
    pub game_id: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDto {
    pub id: String,
    pub name: String,
    pub genres: Vec<String>,
    pub status: GameStatusDto,
    pub score: Option<f64>,
    pub opinion: Option<String>,
    pub favorite: bool,
    pub archived: bool,
    pub updated_at: String,
    pub has_cover: bool,
    pub completed_runs: usize,
    pub has_open_run: bool,
    pub cover_position_x: f64,
    pub cover_position_y: f64,
    pub cover_zoom: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRunDto {
    pub id: String,
    pub game_id: String,
    pub started_on: Option<String>,
    pub finished_on: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDetailDto {
    #[serde(flatten)]
    pub game: GameDto,
    pub runs: Vec<GameRunDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHistoryEntryDto {
    pub run: GameRunDto,
    pub game_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStatisticsDto {
    pub active_games: usize,
    pub playing_games: usize,
    pub completed_games: usize,
    pub replayed_games: usize,
    pub favorite_games: usize,
    pub completed_runs: usize,
    pub average_score: Option<f64>,
    pub by_status: Vec<GameStatusCountDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStatusCountDto {
    pub status: GameStatusDto,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingGameCoverDto {
    pub token: String,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn select_game_cover(
    app: AppHandle,
    state: State<'_, GameCoverState>,
) -> Result<Option<PendingGameCoverDto>, String> {
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
        .map_err(|_| cover_lock_error())?
        .prepare(&path)
        .map_err(|e| e.to_string())?;
    Ok(Some(PendingGameCoverDto {
        token: pending.token,
        original_name: pending.original_name,
        mime_type: pending.mime_type,
        size_bytes: pending.size_bytes,
    }))
}

#[tauri::command]
pub fn prepare_pasted_game_cover(
    state: State<'_, GameCoverState>,
    bytes: Vec<u8>,
) -> Result<PendingGameCoverDto, String> {
    let pending = state
        .store
        .lock()
        .map_err(|_| cover_lock_error())?
        .prepare_jpeg_bytes(&bytes)
        .map_err(|error| error.to_string())?;
    Ok(PendingGameCoverDto {
        token: pending.token,
        original_name: pending.original_name,
        mime_type: pending.mime_type,
        size_bytes: pending.size_bytes,
    })
}

#[tauri::command]
pub fn discard_pending_game_cover(
    state: State<'_, GameCoverState>,
    token: String,
) -> Result<(), String> {
    state
        .store
        .lock()
        .map_err(|_| cover_lock_error())?
        .discard(&token)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_games(
    database: State<'_, ProductDatabase>,
    input: ListGamesInputDto,
) -> Result<Vec<GameDto>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let mut games = repository.list(input.archived).map_err(|e| e.to_string())?;
    let search = input
        .search
        .as_deref()
        .map(normalize)
        .filter(|q| !q.is_empty());
    games.retain(|game| {
        search
            .as_ref()
            .map_or(true, |q| normalize(&game.name).contains(q))
            && input
                .status
                .map_or(true, |status| game.status == status.into())
            && (!input.favorites_only || game.favorite)
    });
    games
        .into_iter()
        .map(|game| game_dto(&mut repository, game))
        .collect()
}

#[tauri::command]
pub fn get_game(
    database: State<'_, ProductDatabase>,
    game_id: String,
) -> Result<GameDetailDto, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    detail(&mut GameRepository::new(&connection), &id)
}

#[tauri::command]
pub fn create_game(
    database: State<'_, ProductDatabase>,
    covers: State<'_, GameCoverState>,
    input: GameInputDto,
) -> Result<GameDto, String> {
    let token = input.cover_token.clone();
    let mut game = Game::new(
        GameId::generate(),
        input.try_into()?,
        Utc::now().to_rfc3339(),
    )
    .map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut store = covers.store.lock().map_err(|_| cover_lock_error())?;
    if let Some(token) = token.as_deref() {
        game.cover = Some(store.promote(token).map_err(|e| e.to_string())?);
    }
    let mut repository = GameRepository::new(&connection);
    if let Err(error) = repository.create(&game) {
        if let Some(cover) = game.cover.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(error.to_string());
    }
    game_dto(&mut repository, game)
}

#[tauri::command]
pub fn update_game(
    database: State<'_, ProductDatabase>,
    covers: State<'_, GameCoverState>,
    game_id: String,
    input: GameInputDto,
) -> Result<GameDto, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let token = input.cover_token.clone();
    let remove = input.remove_cover;
    let draft: GameDraft = input.try_into()?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let mut game = repository
        .find(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No existe el videojuego solicitado.".to_owned())?;
    let old_cover = game.cover.clone();
    game.apply(draft, Utc::now().to_rfc3339())
        .map_err(|e| e.to_string())?;
    let mut store = covers.store.lock().map_err(|_| cover_lock_error())?;
    let promoted = token
        .as_deref()
        .map(|token| store.promote(token).map_err(|e| e.to_string()))
        .transpose()?;
    if promoted.is_some() {
        game.cover = promoted.clone();
        game.change_cover_crop(50.0, 50.0, 1.0, Utc::now().to_rfc3339())
            .map_err(|e| e.to_string())?;
    } else if remove {
        game.cover = None;
        game.change_cover_crop(50.0, 50.0, 1.0, Utc::now().to_rfc3339())
            .map_err(|e| e.to_string())?;
    }
    if let Err(error) = repository.update(&game) {
        if let Some(cover) = promoted.as_ref() {
            let _ = store.delete(cover);
        }
        return Err(error.to_string());
    }
    if (promoted.is_some() || remove) && old_cover != game.cover {
        if let Some(cover) = old_cover.as_ref() {
            let _ = store.delete(cover);
        }
    }
    game_dto(&mut repository, game)
}

#[tauri::command]
pub fn set_game_favorite(
    database: State<'_, ProductDatabase>,
    game_id: String,
    favorite: bool,
) -> Result<GameDto, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    repository
        .set_favorite(&id, favorite)
        .map_err(|e| e.to_string())?;
    let game = repository
        .find(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No existe el videojuego solicitado.".to_owned())?;
    game_dto(&mut repository, game)
}

#[tauri::command]
pub fn archive_game(database: State<'_, ProductDatabase>, game_id: String) -> Result<(), String> {
    set_archived(database, game_id, true)
}
#[tauri::command]
pub fn restore_game(database: State<'_, ProductDatabase>, game_id: String) -> Result<(), String> {
    set_archived(database, game_id, false)
}
fn set_archived(
    database: State<'_, ProductDatabase>,
    game_id: String,
    value: bool,
) -> Result<(), String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    GameRepository::new(&connection)
        .archive(&id, value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_game(
    database: State<'_, ProductDatabase>,
    covers: State<'_, GameCoverState>,
    game_id: String,
) -> Result<(), String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let cover = repository
        .find(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No existe el videojuego solicitado.".to_owned())?
        .cover;
    repository.delete(&id).map_err(|e| e.to_string())?;
    drop(connection);
    if let Some(cover) = cover {
        covers
            .store
            .lock()
            .map_err(|_| cover_lock_error())?
            .delete(&cover)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn start_game_run(
    database: State<'_, ProductDatabase>,
    game_id: String,
    started_on: String,
) -> Result<GameDetailDto, String> {
    create_run_internal(
        database,
        game_id,
        GameRunInputDto {
            started_on: Some(started_on),
            finished_on: None,
            completed: false,
        },
    )
}

#[tauri::command]
pub fn create_game_run(
    database: State<'_, ProductDatabase>,
    game_id: String,
    input: GameRunInputDto,
) -> Result<GameDetailDto, String> {
    create_run_internal(database, game_id, input)
}

fn create_run_internal(
    database: State<'_, ProductDatabase>,
    game_id: String,
    input: GameRunInputDto,
) -> Result<GameDetailDto, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let dates = parse_run_input(input)?;
    let now = Utc::now().to_rfc3339();
    let run =
        GameRun::new(id.clone(), dates.0, dates.1, dates.2, now).map_err(|e| e.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    {
        let mut repository = GameRepository::new(&transaction);
        if repository.find(&id).map_err(|e| e.to_string())?.is_none() {
            return Err("No existe el videojuego solicitado.".into());
        }
        repository.create_run(&run).map_err(|e| e.to_string())?;
        repository
            .synchronize_status_after_run_change(&id)
            .map_err(|e| e.to_string())?;
    }
    transaction.commit().map_err(|e| e.to_string())?;
    detail(&mut GameRepository::new(&connection), &id)
}

#[tauri::command]
pub fn finish_game_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
    finished_on: String,
) -> Result<GameDetailDto, String> {
    let run_id = GameRunId::parse(&run_id).map_err(|e| e.to_string())?;
    let end = parse_date(Some(finished_on))?.ok_or_else(|| "Indica la fecha final.".to_owned())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    let game_id;
    {
        let mut repository = GameRepository::new(&transaction);
        let mut run = repository
            .find_run(&run_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No existe la partida solicitada.".to_owned())?;
        game_id = run.game_id.clone();
        run.update(run.started_on, Some(end), true, Utc::now().to_rfc3339())
            .map_err(|e| e.to_string())?;
        repository.update_run(&run).map_err(|e| e.to_string())?;
        repository
            .synchronize_status_after_run_change(&game_id)
            .map_err(|e| e.to_string())?;
    }
    transaction.commit().map_err(|e| e.to_string())?;
    detail(&mut GameRepository::new(&connection), &game_id)
}

#[tauri::command]
pub fn update_game_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
    input: GameRunInputDto,
) -> Result<GameDetailDto, String> {
    let run_id = GameRunId::parse(&run_id).map_err(|e| e.to_string())?;
    let dates = parse_run_input(input)?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    let game_id;
    {
        let mut repository = GameRepository::new(&transaction);
        let mut run = repository
            .find_run(&run_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No existe la partida solicitada.".to_owned())?;
        game_id = run.game_id.clone();
        run.update(dates.0, dates.1, dates.2, Utc::now().to_rfc3339())
            .map_err(|e| e.to_string())?;
        repository.update_run(&run).map_err(|e| e.to_string())?;
        repository
            .synchronize_status_after_run_change(&game_id)
            .map_err(|e| e.to_string())?;
    }
    transaction.commit().map_err(|e| e.to_string())?;
    detail(&mut GameRepository::new(&connection), &game_id)
}

#[tauri::command]
pub fn delete_game_run(
    database: State<'_, ProductDatabase>,
    run_id: String,
) -> Result<GameDetailDto, String> {
    let run_id = GameRunId::parse(&run_id).map_err(|e| e.to_string())?;
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    let game_id;
    {
        let mut repository = GameRepository::new(&transaction);
        game_id = repository.delete_run(&run_id).map_err(|e| e.to_string())?;
        repository
            .synchronize_status_after_run_change(&game_id)
            .map_err(|e| e.to_string())?;
    }
    transaction.commit().map_err(|e| e.to_string())?;
    detail(&mut GameRepository::new(&connection), &game_id)
}

#[tauri::command]
pub fn list_game_history(
    database: State<'_, ProductDatabase>,
    input: GameHistoryInputDto,
) -> Result<Vec<GameHistoryEntryDto>, String> {
    let selected_id = input
        .game_id
        .as_deref()
        .map(GameId::parse)
        .transpose()
        .map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let games = repository.list(false).map_err(|e| e.to_string())?;
    let runs = repository.all_runs().map_err(|e| e.to_string())?;
    Ok(runs
        .into_iter()
        .filter(|run| selected_id.as_ref().map_or(true, |id| id == &run.game_id))
        .filter(|run| {
            input.year.map_or(true, |year| {
                run.finished_on
                    .or(run.started_on)
                    .is_some_and(|date| date.year() == year)
            })
        })
        .filter_map(|run| {
            games
                .iter()
                .find(|game| game.id == run.game_id)
                .map(|game| GameHistoryEntryDto {
                    run: run.into(),
                    game_name: game.name.clone(),
                })
        })
        .collect())
}

#[tauri::command]
pub fn get_game_statistics(
    database: State<'_, ProductDatabase>,
) -> Result<GameStatisticsDto, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let games = repository.list(false).map_err(|e| e.to_string())?;
    let runs = repository.all_runs().map_err(|e| e.to_string())?;
    let scored = games
        .iter()
        .filter_map(|game| game.score)
        .collect::<Vec<_>>();
    let statuses = [
        GameStatus::Pending,
        GameStatus::Playing,
        GameStatus::Paused,
        GameStatus::Completed,
        GameStatus::Abandoned,
    ];
    Ok(GameStatisticsDto {
        active_games: games.len(),
        playing_games: games
            .iter()
            .filter(|g| g.status == GameStatus::Playing)
            .count(),
        completed_games: games
            .iter()
            .filter(|g| g.status == GameStatus::Completed)
            .count(),
        replayed_games: games
            .iter()
            .filter(|game| {
                runs.iter()
                    .filter(|run| run.game_id == game.id && run.completed)
                    .count()
                    > 1
            })
            .count(),
        favorite_games: games.iter().filter(|g| g.favorite).count(),
        completed_runs: runs.iter().filter(|r| r.completed).count(),
        average_score: (!scored.is_empty())
            .then(|| scored.iter().sum::<f64>() / scored.len() as f64),
        by_status: statuses
            .into_iter()
            .map(|status| GameStatusCountDto {
                status: status.into(),
                count: games.iter().filter(|g| g.status == status).count(),
            })
            .collect(),
    })
}

#[tauri::command]
pub fn read_game_cover(
    database: State<'_, ProductDatabase>,
    covers: State<'_, GameCoverState>,
    game_id: String,
) -> Result<tauri::ipc::Response, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let cover = GameRepository::new(&connection)
        .find(&id)
        .map_err(|e| e.to_string())?
        .and_then(|g| g.cover)
        .ok_or_else(|| "Este videojuego no tiene portada.".to_owned())?;
    let bytes = covers
        .store
        .lock()
        .map_err(|_| cover_lock_error())?
        .read(&cover)
        .map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn set_game_cover_crop(
    database: State<'_, ProductDatabase>,
    game_id: String,
    x: f64,
    y: f64,
    zoom: f64,
) -> Result<GameDto, String> {
    let id = GameId::parse(&game_id).map_err(|e| e.to_string())?;
    let connection = database
        .connection
        .lock()
        .map_err(|_| database_lock_error())?;
    let mut repository = GameRepository::new(&connection);
    let mut game = repository
        .find(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No existe el videojuego solicitado.".to_owned())?;
    if game.cover.is_none() {
        return Err("Este videojuego no tiene portada.".to_owned());
    }
    game.change_cover_crop(x, y, zoom, Utc::now().to_rfc3339())
        .map_err(|e| e.to_string())?;
    repository.update(&game).map_err(|e| e.to_string())?;
    game_dto(&mut repository, game)
}

fn detail(repository: &mut GameRepository<'_>, id: &GameId) -> Result<GameDetailDto, String> {
    let game = repository
        .find(id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No existe el videojuego solicitado.".to_owned())?;
    let runs = repository.runs_for(id).map_err(|e| e.to_string())?;
    Ok(GameDetailDto {
        game: dto_from_parts(game, &runs),
        runs: runs.into_iter().map(Into::into).collect(),
    })
}
fn game_dto(repository: &mut GameRepository<'_>, game: Game) -> Result<GameDto, String> {
    let runs = repository.runs_for(&game.id).map_err(|e| e.to_string())?;
    Ok(dto_from_parts(game, &runs))
}
fn dto_from_parts(game: Game, runs: &[GameRun]) -> GameDto {
    GameDto {
        id: game.id.as_str().into(),
        name: game.name,
        genres: game.genres,
        status: game.status.into(),
        score: game.score,
        opinion: game.opinion,
        favorite: game.favorite,
        archived: game.archived,
        updated_at: game.updated_at,
        has_cover: game.cover.is_some(),
        completed_runs: runs.iter().filter(|run| run.completed).count(),
        has_open_run: runs.iter().any(|run| run.finished_on.is_none()),
        cover_position_x: game.cover_position_x,
        cover_position_y: game.cover_position_y,
        cover_zoom: game.cover_zoom,
    }
}
fn parse_run_input(
    input: GameRunInputDto,
) -> Result<(Option<NaiveDate>, Option<NaiveDate>, bool), String> {
    Ok((
        parse_date(input.started_on)?,
        parse_date(input.finished_on)?,
        input.completed,
    ))
}
fn parse_date(value: Option<String>) -> Result<Option<NaiveDate>, String> {
    let date = value
        .filter(|v| !v.trim().is_empty())
        .map(|v| {
            NaiveDate::parse_from_str(&v, "%Y-%m-%d")
                .map_err(|_| "La fecha no es válida.".to_owned())
        })
        .transpose()?;
    if date.is_some_and(|value| value > madrid_today()) {
        return Err("No se puede registrar una partida futura.".to_owned());
    }
    Ok(date)
}

fn madrid_today() -> NaiveDate {
    let now = Utc::now().with_timezone(&Madrid);
    NaiveDate::from_ymd_opt(now.year(), now.month(), now.day()).expect("fecha de chrono válida")
}
fn database_lock_error() -> String {
    "No se ha podido acceder a la base de datos.".to_owned()
}
fn cover_lock_error() -> String {
    "No se pudo acceder al almacenamiento de portadas.".to_owned()
}

impl TryFrom<GameInputDto> for GameDraft {
    type Error = String;
    fn try_from(value: GameInputDto) -> Result<Self, Self::Error> {
        Ok(Self {
            name: value.name,
            genres: value.genres,
            status: value.status.into(),
            score: value.score,
            opinion: value.opinion,
            favorite: value.favorite,
        })
    }
}
impl From<GameStatusDto> for GameStatus {
    fn from(v: GameStatusDto) -> Self {
        match v {
            GameStatusDto::Pending => Self::Pending,
            GameStatusDto::Playing => Self::Playing,
            GameStatusDto::Paused => Self::Paused,
            GameStatusDto::Completed => Self::Completed,
            GameStatusDto::Abandoned => Self::Abandoned,
        }
    }
}
impl From<GameStatus> for GameStatusDto {
    fn from(v: GameStatus) -> Self {
        match v {
            GameStatus::Pending => Self::Pending,
            GameStatus::Playing => Self::Playing,
            GameStatus::Paused => Self::Paused,
            GameStatus::Completed => Self::Completed,
            GameStatus::Abandoned => Self::Abandoned,
        }
    }
}
impl From<GameRun> for GameRunDto {
    fn from(run: GameRun) -> Self {
        Self {
            id: run.id.as_str().into(),
            game_id: run.game_id.as_str().into(),
            started_on: run.started_on.map(|d| d.to_string()),
            finished_on: run.finished_on.map(|d| d.to_string()),
            completed: run.completed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parse_date;

    #[test]
    fn history_dates_reject_the_future() {
        assert!(parse_date(Some("2000-01-01".into())).is_ok());
        assert!(parse_date(Some("9999-01-01".into())).is_err());
    }
}
