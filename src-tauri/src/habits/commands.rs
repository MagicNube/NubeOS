//! Contratos Tauri y casos de uso del módulo Hábitos.

use chrono::{DateTime, Datelike, NaiveDate, Utc};
use chrono_tz::Europe::Madrid;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::meals::commands::ProductDatabase;

use super::{
    model::{
        Habit, HabitCategory, HabitIcon, HabitId, HabitKind, HabitLogState, HabitStatus, Schedule,
    },
    repository::{format_date, parse_date, HabitRepository, HabitRepositoryError},
    service::{
        build_overview, build_statistics, resolve_statistics_window, validate_log_date,
        HabitStatistics, OverviewKind, OverviewRow, Progress, StatisticsOverview, StatisticsPeriod,
        StreakUnit,
    },
};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HabitKindDto {
    Habit,
    Routine,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HabitCategoryDto {
    Health,
    Sport,
    Learning,
    PersonalCare,
    Home,
    Organization,
    Leisure,
    Other,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HabitIconDto {
    Check,
    Book,
    Languages,
    Dumbbell,
    Heart,
    Sparkles,
    Home,
    Battery,
    Droplets,
    Moon,
    Backpack,
    CalendarRange,
    Scissors,
    WashingMachine,
    BedDouble,
    Shirt,
    Razor,
    BedSingle,
    Bath,
    Shower,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HabitStatusDto {
    Active,
    Paused,
    Archived,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HabitLogStateDto {
    Completed,
    Skipped,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum HabitScheduleDto {
    Daily,
    SpecificWeekdays {
        weekdays: Vec<u8>,
    },
    WeeklyTarget {
        target: u8,
        preferred_weekdays: Vec<u8>,
    },
    MonthlyTarget {
        target: u8,
        preferred_days: Vec<u8>,
    },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitInputDto {
    pub name: String,
    pub kind: HabitKindDto,
    pub category: HabitCategoryDto,
    pub icon: HabitIconDto,
    pub starts_on: String,
    pub schedule: HabitScheduleDto,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListHabitsInputDto {
    #[serde(default)]
    pub archived: bool,
    pub search: Option<String>,
    pub category: Option<HabitCategoryDto>,
    pub kind: Option<HabitKindDto>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HabitDto {
    pub id: String,
    pub name: String,
    pub kind: HabitKindDto,
    pub category: HabitCategoryDto,
    pub icon: HabitIconDto,
    pub status: HabitStatusDto,
    pub position: u32,
    pub created_on: String,
    pub starts_on: String,
    pub schedule: HabitScheduleDto,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitOverviewKindDto {
    Day,
    Week,
    Month,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitOverviewInputDto {
    pub view: HabitOverviewKindDto,
    pub anchor_date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitOverviewDto {
    pub start: String,
    pub end: String,
    pub today: String,
    pub rows: Vec<HabitOverviewRowDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitOverviewRowDto {
    pub habit: HabitDto,
    pub cells: Vec<HabitOverviewCellDto>,
    pub progress: HabitProgressDto,
    pub last_completed_on: Option<String>,
    pub next_due_on: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitOverviewCellDto {
    pub date: String,
    pub applicable: bool,
    pub preferred: bool,
    pub state: Option<HabitLogStateDto>,
    pub can_edit: bool,
}

#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct HabitProgressDto {
    pub completed: u32,
    pub target: u32,
    pub effective_target: u32,
    pub neutral: bool,
    pub partial: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitStatisticsOverviewDto {
    pub range_start: String,
    pub range_end: String,
    pub items: Vec<HabitStatisticsDto>,
    pub average_completion_rate: f64,
    pub most_consistent_id: Option<String>,
    pub needs_attention_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitStatisticsDto {
    pub habit: HabitDto,
    pub completed_count: u32,
    pub effective_opportunities: u32,
    pub completion_rate: f64,
    pub current_streak: u32,
    pub best_streak: u32,
    pub streak_unit: StreakUnitDto,
    pub current_progress: HabitProgressDto,
    pub last_completed_on: Option<String>,
    pub sample_size: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StreakUnitDto {
    Day,
    Week,
    Month,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitStatisticsPeriodDto {
    Week,
    Month,
    Year,
    All,
    Custom,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitStatisticsInputDto {
    pub period: HabitStatisticsPeriodDto,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[tauri::command]
pub fn list_habits(
    state: State<'_, ProductDatabase>,
    input: ListHabitsInputDto,
) -> Result<Vec<HabitDto>, String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let status = input.archived.then_some(HabitStatus::Archived);
        let aggregates = HabitRepository::new(connection).load_aggregates(status)?;
        let search = input
            .search
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_lowercase);
        Ok(aggregates
            .into_iter()
            .filter(|aggregate| {
                let habit = &aggregate.habit;
                search
                    .as_ref()
                    .map_or(true, |query| habit.name.to_lowercase().contains(query))
                    && input
                        .category
                        .map_or(true, |value| habit.category == category_from_dto(value))
                    && input
                        .kind
                        .map_or(true, |value| habit.kind == kind_from_dto(value))
            })
            .map(|aggregate| habit_dto(&aggregate, today))
            .collect())
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn create_habit(
    state: State<'_, ProductDatabase>,
    input: HabitInputDto,
) -> Result<HabitDto, String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let starts_on = parse_input_date(&input.starts_on)?;
        if starts_on < today {
            return Err(HabitCommandError::Rule(
                "La fecha de inicio debe ser hoy o una fecha futura.",
            ));
        }
        let mut repository = HabitRepository::new(connection);
        let habit = habit_from_input(
            HabitId::generate(),
            input,
            HabitStatus::Active,
            repository.next_position()?,
            today,
            starts_on,
        )?;
        repository.create(&habit)?;
        let aggregate = repository.find_aggregate(&habit.id)?;
        Ok(habit_dto(&aggregate, today))
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn update_habit(
    state: State<'_, ProductDatabase>,
    habit_id: String,
    input: HabitInputDto,
) -> Result<HabitDto, String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let id = HabitId::new(habit_id)?;
        let mut repository = HabitRepository::new(connection);
        let current = repository.find_aggregate(&id)?;
        let starts_on = parse_input_date(&input.starts_on)?;
        if starts_on != current.habit.starts_on && starts_on < today {
            return Err(HabitCommandError::Rule(
                "La nueva fecha de inicio debe ser hoy o una fecha futura.",
            ));
        }
        let habit = habit_from_input(
            id,
            input,
            current.habit.status,
            current.habit.position,
            current.habit.created_on,
            starts_on,
        )?;
        repository.update(&habit, today)?;
        let aggregate = repository.find_aggregate(&habit.id)?;
        Ok(habit_dto(&aggregate, today))
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn set_habit_log(
    state: State<'_, ProductDatabase>,
    habit_id: String,
    date: String,
    log_state: Option<HabitLogStateDto>,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let id = HabitId::new(habit_id)?;
        let date = parse_input_date(&date)?;
        let mut repository = HabitRepository::new(connection);
        let aggregate = repository.find_aggregate(&id)?;
        validate_log_date(&aggregate, date, today).map_err(HabitCommandError::Rule)?;
        repository.set_log(&id, date, log_state.map(log_state_from_dto))?;
        Ok(())
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn pause_habit(state: State<'_, ProductDatabase>, habit_id: String) -> Result<(), String> {
    mutate_id(&state, habit_id, |repository, id| {
        repository.pause(id, madrid_today())
    })
}

#[tauri::command]
pub fn resume_habit(state: State<'_, ProductDatabase>, habit_id: String) -> Result<(), String> {
    mutate_id(&state, habit_id, |repository, id| {
        repository.resume(id, madrid_today())
    })
}

#[tauri::command]
pub fn archive_habit(state: State<'_, ProductDatabase>, habit_id: String) -> Result<(), String> {
    mutate_id(&state, habit_id, |repository, id| {
        repository.archive(id, madrid_today())
    })
}

#[tauri::command]
pub fn restore_habit(state: State<'_, ProductDatabase>, habit_id: String) -> Result<(), String> {
    mutate_id(&state, habit_id, |repository, id| {
        repository.restore(id, madrid_today())
    })
}

#[tauri::command]
pub fn delete_habit(state: State<'_, ProductDatabase>, habit_id: String) -> Result<(), String> {
    mutate_id(&state, habit_id, |repository, id| {
        repository.delete_archived(id)
    })
}

#[tauri::command]
pub fn reorder_habits(
    state: State<'_, ProductDatabase>,
    habit_ids: Vec<String>,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let ids = habit_ids
            .into_iter()
            .map(HabitId::new)
            .collect::<Result<Vec<_>, _>>()?;
        HabitRepository::new(connection).reorder(&ids)?;
        Ok(())
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn get_habits_overview(
    state: State<'_, ProductDatabase>,
    input: HabitOverviewInputDto,
) -> Result<HabitOverviewDto, String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let anchor = parse_input_date(&input.anchor_date)?;
        let aggregates = HabitRepository::new(connection).load_aggregates(None)?;
        let overview = build_overview(
            &aggregates,
            overview_kind_from_dto(input.view),
            anchor,
            today,
        );
        Ok(HabitOverviewDto {
            start: format_date(overview.start),
            end: format_date(overview.end),
            today: format_date(overview.today),
            rows: overview
                .rows
                .into_iter()
                .map(|row| overview_row_dto(row, &aggregates, overview.end))
                .collect(),
        })
    })
    .map_err(error_message)
}

#[tauri::command]
pub fn get_habit_statistics(
    state: State<'_, ProductDatabase>,
    input: HabitStatisticsInputDto,
) -> Result<HabitStatisticsOverviewDto, String> {
    with_connection(&state, |connection| {
        let today = madrid_today();
        let aggregates = HabitRepository::new(connection).load_aggregates(None)?;
        let custom_start = input
            .from_date
            .as_deref()
            .map(parse_input_date)
            .transpose()?;
        let custom_end = input.to_date.as_deref().map(parse_input_date).transpose()?;
        let earliest_start = aggregates
            .iter()
            .map(|aggregate| aggregate.habit.starts_on)
            .min();
        let window = resolve_statistics_window(
            statistics_period_from_dto(input.period),
            custom_start,
            custom_end,
            today,
            earliest_start,
        )
        .map_err(HabitCommandError::Rule)?;
        Ok(statistics_dto(
            build_statistics(&aggregates, window),
            &aggregates,
            window.end,
        ))
    })
    .map_err(error_message)
}

fn overview_row_dto(
    row: OverviewRow,
    aggregates: &[super::model::HabitAggregate],
    reference: NaiveDate,
) -> HabitOverviewRowDto {
    let aggregate = &aggregates[row.habit_index];
    HabitOverviewRowDto {
        habit: habit_dto(aggregate, reference),
        cells: row
            .cells
            .into_iter()
            .map(|cell| HabitOverviewCellDto {
                date: format_date(cell.date),
                applicable: cell.applicable,
                preferred: cell.preferred,
                state: cell.state.map(log_state_to_dto),
                can_edit: cell.can_edit,
            })
            .collect(),
        progress: progress_dto(row.progress),
        last_completed_on: row.last_completed_on.map(format_date),
        next_due_on: row.next_due_on.map(format_date),
    }
}

fn statistics_dto(
    statistics: StatisticsOverview,
    aggregates: &[super::model::HabitAggregate],
    today: NaiveDate,
) -> HabitStatisticsOverviewDto {
    let most_consistent_id = statistics
        .most_consistent_index
        .map(|index| aggregates[index].habit.id.as_str().to_owned());
    let needs_attention_id = statistics
        .needs_attention_index
        .map(|index| aggregates[index].habit.id.as_str().to_owned());
    HabitStatisticsOverviewDto {
        range_start: format_date(statistics.start),
        range_end: format_date(statistics.end),
        items: statistics
            .items
            .into_iter()
            .map(|item| statistic_dto(item, aggregates, today))
            .collect(),
        average_completion_rate: statistics.average_completion_rate,
        most_consistent_id,
        needs_attention_id,
    }
}

fn statistic_dto(
    item: HabitStatistics,
    aggregates: &[super::model::HabitAggregate],
    today: NaiveDate,
) -> HabitStatisticsDto {
    HabitStatisticsDto {
        habit: habit_dto(&aggregates[item.habit_index], today),
        completed_count: item.completed_count,
        effective_opportunities: item.effective_opportunities,
        completion_rate: item.completion_rate,
        current_streak: item.current_streak,
        best_streak: item.best_streak,
        streak_unit: match item.streak_unit {
            StreakUnit::Day => StreakUnitDto::Day,
            StreakUnit::Week => StreakUnitDto::Week,
            StreakUnit::Month => StreakUnitDto::Month,
        },
        current_progress: progress_dto(item.current_progress),
        last_completed_on: item.last_completed_on.map(format_date),
        sample_size: item.sample_size,
    }
}

fn progress_dto(progress: Progress) -> HabitProgressDto {
    HabitProgressDto {
        completed: progress.completed,
        target: progress.target,
        effective_target: progress.effective_target,
        neutral: progress.neutral,
        partial: progress.partial,
    }
}

fn habit_dto(aggregate: &super::model::HabitAggregate, reference: NaiveDate) -> HabitDto {
    let habit = &aggregate.habit;
    let schedule = aggregate.schedule_at(reference).unwrap_or(&habit.schedule);
    HabitDto {
        id: habit.id.as_str().to_owned(),
        name: habit.name.clone(),
        kind: kind_to_dto(habit.kind),
        category: category_to_dto(habit.category),
        icon: icon_to_dto(habit.icon),
        status: status_to_dto(habit.status),
        position: habit.position,
        created_on: format_date(habit.created_on),
        starts_on: format_date(habit.starts_on),
        schedule: schedule_to_dto(schedule),
    }
}

fn habit_from_input(
    id: HabitId,
    input: HabitInputDto,
    status: HabitStatus,
    position: u32,
    created_on: NaiveDate,
    starts_on: NaiveDate,
) -> Result<Habit, HabitCommandError> {
    Habit::new(
        id,
        input.name,
        kind_from_dto(input.kind),
        category_from_dto(input.category),
        icon_from_dto(input.icon),
        status,
        position,
        created_on,
        starts_on,
        schedule_from_dto(input.schedule),
    )
    .map_err(HabitCommandError::Domain)
}

fn schedule_from_dto(value: HabitScheduleDto) -> Schedule {
    match value {
        HabitScheduleDto::Daily => Schedule::Daily,
        HabitScheduleDto::SpecificWeekdays { weekdays } => Schedule::SpecificWeekdays { weekdays },
        HabitScheduleDto::WeeklyTarget {
            target,
            preferred_weekdays,
        } => Schedule::WeeklyTarget {
            target,
            preferred_weekdays,
        },
        HabitScheduleDto::MonthlyTarget {
            target,
            preferred_days,
        } => Schedule::MonthlyTarget {
            target,
            preferred_days,
        },
    }
}
fn schedule_to_dto(value: &Schedule) -> HabitScheduleDto {
    match value {
        Schedule::Daily => HabitScheduleDto::Daily,
        Schedule::SpecificWeekdays { weekdays } => HabitScheduleDto::SpecificWeekdays {
            weekdays: weekdays.clone(),
        },
        Schedule::WeeklyTarget {
            target,
            preferred_weekdays,
        } => HabitScheduleDto::WeeklyTarget {
            target: *target,
            preferred_weekdays: preferred_weekdays.clone(),
        },
        Schedule::MonthlyTarget {
            target,
            preferred_days,
        } => HabitScheduleDto::MonthlyTarget {
            target: *target,
            preferred_days: preferred_days.clone(),
        },
    }
}
fn kind_from_dto(value: HabitKindDto) -> HabitKind {
    match value {
        HabitKindDto::Habit => HabitKind::Habit,
        HabitKindDto::Routine => HabitKind::Routine,
    }
}
fn kind_to_dto(value: HabitKind) -> HabitKindDto {
    match value {
        HabitKind::Habit => HabitKindDto::Habit,
        HabitKind::Routine => HabitKindDto::Routine,
    }
}
fn category_from_dto(value: HabitCategoryDto) -> HabitCategory {
    match value {
        HabitCategoryDto::Health => HabitCategory::Health,
        HabitCategoryDto::Sport => HabitCategory::Sport,
        HabitCategoryDto::Learning => HabitCategory::Learning,
        HabitCategoryDto::PersonalCare => HabitCategory::PersonalCare,
        HabitCategoryDto::Home => HabitCategory::Home,
        HabitCategoryDto::Organization => HabitCategory::Organization,
        HabitCategoryDto::Leisure => HabitCategory::Leisure,
        HabitCategoryDto::Other => HabitCategory::Other,
    }
}
fn category_to_dto(value: HabitCategory) -> HabitCategoryDto {
    match value {
        HabitCategory::Health => HabitCategoryDto::Health,
        HabitCategory::Sport => HabitCategoryDto::Sport,
        HabitCategory::Learning => HabitCategoryDto::Learning,
        HabitCategory::PersonalCare => HabitCategoryDto::PersonalCare,
        HabitCategory::Home => HabitCategoryDto::Home,
        HabitCategory::Organization => HabitCategoryDto::Organization,
        HabitCategory::Leisure => HabitCategoryDto::Leisure,
        HabitCategory::Other => HabitCategoryDto::Other,
    }
}
fn icon_from_dto(value: HabitIconDto) -> HabitIcon {
    match value {
        HabitIconDto::Check => HabitIcon::Check,
        HabitIconDto::Book => HabitIcon::Book,
        HabitIconDto::Languages => HabitIcon::Languages,
        HabitIconDto::Dumbbell => HabitIcon::Dumbbell,
        HabitIconDto::Heart => HabitIcon::Heart,
        HabitIconDto::Sparkles => HabitIcon::Sparkles,
        HabitIconDto::Home => HabitIcon::Home,
        HabitIconDto::Battery => HabitIcon::Battery,
        HabitIconDto::Droplets => HabitIcon::Droplets,
        HabitIconDto::Moon => HabitIcon::Moon,
        HabitIconDto::Backpack => HabitIcon::Backpack,
        HabitIconDto::CalendarRange => HabitIcon::CalendarRange,
        HabitIconDto::Scissors => HabitIcon::Scissors,
        HabitIconDto::WashingMachine => HabitIcon::WashingMachine,
        HabitIconDto::BedDouble => HabitIcon::BedDouble,
        HabitIconDto::Shirt => HabitIcon::Shirt,
        HabitIconDto::Razor => HabitIcon::Razor,
        HabitIconDto::BedSingle => HabitIcon::BedSingle,
        HabitIconDto::Bath => HabitIcon::Bath,
        HabitIconDto::Shower => HabitIcon::Shower,
    }
}
fn icon_to_dto(value: HabitIcon) -> HabitIconDto {
    match value {
        HabitIcon::Check => HabitIconDto::Check,
        HabitIcon::Book => HabitIconDto::Book,
        HabitIcon::Languages => HabitIconDto::Languages,
        HabitIcon::Dumbbell => HabitIconDto::Dumbbell,
        HabitIcon::Heart => HabitIconDto::Heart,
        HabitIcon::Sparkles => HabitIconDto::Sparkles,
        HabitIcon::Home => HabitIconDto::Home,
        HabitIcon::Battery => HabitIconDto::Battery,
        HabitIcon::Droplets => HabitIconDto::Droplets,
        HabitIcon::Moon => HabitIconDto::Moon,
        HabitIcon::Backpack => HabitIconDto::Backpack,
        HabitIcon::CalendarRange => HabitIconDto::CalendarRange,
        HabitIcon::Scissors => HabitIconDto::Scissors,
        HabitIcon::WashingMachine => HabitIconDto::WashingMachine,
        HabitIcon::BedDouble => HabitIconDto::BedDouble,
        HabitIcon::Shirt => HabitIconDto::Shirt,
        HabitIcon::Razor => HabitIconDto::Razor,
        HabitIcon::BedSingle => HabitIconDto::BedSingle,
        HabitIcon::Bath => HabitIconDto::Bath,
        HabitIcon::Shower => HabitIconDto::Shower,
    }
}
fn status_to_dto(value: HabitStatus) -> HabitStatusDto {
    match value {
        HabitStatus::Active => HabitStatusDto::Active,
        HabitStatus::Paused => HabitStatusDto::Paused,
        HabitStatus::Archived => HabitStatusDto::Archived,
    }
}
fn log_state_from_dto(value: HabitLogStateDto) -> HabitLogState {
    match value {
        HabitLogStateDto::Completed => HabitLogState::Completed,
        HabitLogStateDto::Skipped => HabitLogState::Skipped,
    }
}
fn log_state_to_dto(value: HabitLogState) -> HabitLogStateDto {
    match value {
        HabitLogState::Completed => HabitLogStateDto::Completed,
        HabitLogState::Skipped => HabitLogStateDto::Skipped,
    }
}
fn overview_kind_from_dto(value: HabitOverviewKindDto) -> OverviewKind {
    match value {
        HabitOverviewKindDto::Day => OverviewKind::Day,
        HabitOverviewKindDto::Week => OverviewKind::Week,
        HabitOverviewKindDto::Month => OverviewKind::Month,
    }
}

fn statistics_period_from_dto(value: HabitStatisticsPeriodDto) -> StatisticsPeriod {
    match value {
        HabitStatisticsPeriodDto::Week => StatisticsPeriod::Week,
        HabitStatisticsPeriodDto::Month => StatisticsPeriod::Month,
        HabitStatisticsPeriodDto::Year => StatisticsPeriod::Year,
        HabitStatisticsPeriodDto::All => StatisticsPeriod::All,
        HabitStatisticsPeriodDto::Custom => StatisticsPeriod::Custom,
    }
}

fn parse_input_date(value: &str) -> Result<NaiveDate, HabitCommandError> {
    parse_date(value).map_err(HabitCommandError::Repository)
}
fn madrid_today() -> NaiveDate {
    let utc: DateTime<Utc> = std::time::SystemTime::now().into();
    let local = utc.with_timezone(&Madrid);
    NaiveDate::from_ymd_opt(local.year(), local.month(), local.day())
        .expect("chrono produce fechas válidas")
}

fn mutate_id(
    state: &State<'_, ProductDatabase>,
    value: String,
    operation: impl FnOnce(&mut HabitRepository<'_>, &HabitId) -> Result<(), HabitRepositoryError>,
) -> Result<(), String> {
    with_connection(state, |connection| {
        let id = HabitId::new(value)?;
        operation(&mut HabitRepository::new(connection), &id)?;
        Ok(())
    })
    .map_err(error_message)
}

fn with_connection<T>(
    state: &State<'_, ProductDatabase>,
    operation: impl FnOnce(&mut Connection) -> Result<T, HabitCommandError>,
) -> Result<T, HabitCommandError> {
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| HabitCommandError::Unavailable)?;
    operation(&mut connection)
}

#[derive(Debug)]
enum HabitCommandError {
    Domain(super::model::HabitError),
    Repository(HabitRepositoryError),
    Rule(&'static str),
    Unavailable,
}
impl From<super::model::HabitError> for HabitCommandError {
    fn from(value: super::model::HabitError) -> Self {
        Self::Domain(value)
    }
}
impl From<HabitRepositoryError> for HabitCommandError {
    fn from(value: HabitRepositoryError) -> Self {
        Self::Repository(value)
    }
}
fn error_message(error: HabitCommandError) -> String {
    match error {
        HabitCommandError::Domain(error) => error.to_string(),
        HabitCommandError::Repository(error) => error.to_string(),
        HabitCommandError::Rule(message) => message.to_owned(),
        HabitCommandError::Unavailable => "La base de datos no está disponible.".to_owned(),
    }
}
