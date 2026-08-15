//! Persistencia SQLite del módulo Hábitos.

use std::{collections::BTreeMap, fmt};

use chrono::{DateTime, NaiveDate, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::model::{
    Habit, HabitAggregate, HabitCategory, HabitError, HabitIcon, HabitId, HabitKind, HabitLogState,
    HabitStatus, PauseInterval, Schedule, ScheduleRevision,
};

#[derive(Debug)]
pub enum HabitRepositoryError {
    Database(rusqlite::Error),
    Domain(HabitError),
    InvalidStoredValue(&'static str),
    NotFound,
    MustBeArchived,
    InvalidOrder,
    StartDateLocked,
}

impl fmt::Display for HabitRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::Domain(error) => write!(formatter, "Actividad inválida: {error}"),
            Self::InvalidStoredValue(field) => {
                write!(formatter, "Valor guardado inválido: {field}")
            }
            Self::NotFound => formatter.write_str("No existe la actividad solicitada."),
            Self::MustBeArchived => formatter.write_str("La actividad debe estar archivada."),
            Self::InvalidOrder => formatter
                .write_str("El orden recibido no contiene todas las actividades disponibles."),
            Self::StartDateLocked => formatter.write_str(
                "La fecha de inicio no puede cambiar después de registrar la actividad.",
            ),
        }
    }
}

impl std::error::Error for HabitRepositoryError {}
impl From<rusqlite::Error> for HabitRepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Database(value)
    }
}
impl From<HabitError> for HabitRepositoryError {
    fn from(value: HabitError) -> Self {
        Self::Domain(value)
    }
}

pub struct HabitRepository<'connection> {
    connection: &'connection mut Connection,
}

impl<'connection> HabitRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn next_position(&self) -> Result<u32, HabitRepositoryError> {
        let position: i64 = self.connection.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM habits WHERE status <> 'archived'",
            [],
            |row| row.get(0),
        )?;
        u32::try_from(position).map_err(|_| HabitRepositoryError::InvalidStoredValue("position"))
    }

    pub fn create(&mut self, habit: &Habit) -> Result<(), HabitRepositoryError> {
        let now = now_string();
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO habits (id, name, normalized_name, kind, category, icon, icon_key, status, position, created_on, starts_on, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
            params![habit.id.as_str(), habit.name, normalize(&habit.name), kind_to_str(habit.kind), category_to_str(habit.category), legacy_icon_to_str(habit.icon), icon_to_str(habit.icon), status_to_str(habit.status), habit.position, format_date(habit.created_on), format_date(habit.starts_on), now],
        )?;
        insert_schedule(
            &transaction,
            habit.id.as_str(),
            habit.created_on,
            &habit.schedule,
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn update(
        &mut self,
        habit: &Habit,
        effective_from: NaiveDate,
    ) -> Result<(), HabitRepositoryError> {
        let transaction = self.connection.transaction()?;
        let (stored_start, log_count): (String, i64) = transaction
            .query_row(
                "SELECT starts_on, (SELECT COUNT(*) FROM habit_logs WHERE habit_id = habits.id) FROM habits WHERE id = ?1 AND status <> 'archived'",
                [habit.id.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?
            .ok_or(HabitRepositoryError::NotFound)?;
        if parse_date(&stored_start)? != habit.starts_on && log_count > 0 {
            return Err(HabitRepositoryError::StartDateLocked);
        }
        let changed = transaction.execute(
            "UPDATE habits SET name = ?2, normalized_name = ?3, kind = ?4, category = ?5, icon = ?6, icon_key = ?7, starts_on = ?8, updated_at = ?9 WHERE id = ?1 AND status <> 'archived'",
            params![habit.id.as_str(), habit.name, normalize(&habit.name), kind_to_str(habit.kind), category_to_str(habit.category), legacy_icon_to_str(habit.icon), icon_to_str(habit.icon), format_date(habit.starts_on), now_string()],
        )?;
        if changed == 0 {
            return Err(HabitRepositoryError::NotFound);
        }
        insert_schedule(
            &transaction,
            habit.id.as_str(),
            effective_from,
            &habit.schedule,
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn load_aggregates(
        &mut self,
        status: Option<HabitStatus>,
    ) -> Result<Vec<HabitAggregate>, HabitRepositoryError> {
        let mut sql =
            "SELECT id, name, kind, category, icon_key, status, position, created_on, starts_on FROM habits"
                .to_owned();
        if status.is_some() {
            sql.push_str(" WHERE status = ?1");
        } else {
            sql.push_str(" WHERE status <> 'archived'");
        }
        sql.push_str(" ORDER BY position, name COLLATE NOCASE");
        let habits = {
            let mut statement = self.connection.prepare(&sql)?;
            let rows = if let Some(status) = status {
                statement
                    .query_map([status_to_str(status)], habit_from_row)?
                    .collect::<Result<Vec<_>, _>>()?
            } else {
                statement
                    .query_map([], habit_from_row)?
                    .collect::<Result<Vec<_>, _>>()?
            };
            rows
        };
        habits
            .into_iter()
            .map(|habit| self.load_aggregate(habit))
            .collect()
    }

    pub fn find_aggregate(&mut self, id: &HabitId) -> Result<HabitAggregate, HabitRepositoryError> {
        let habit = self.connection.query_row(
            "SELECT id, name, kind, category, icon_key, status, position, created_on, starts_on FROM habits WHERE id = ?1",
            [id.as_str()], habit_from_row,
        ).optional()?.ok_or(HabitRepositoryError::NotFound)?;
        self.load_aggregate(habit)
    }

    fn load_aggregate(&mut self, mut habit: Habit) -> Result<HabitAggregate, HabitRepositoryError> {
        let revisions = load_revisions(self.connection, &habit.id)?;
        if let Some(latest) = revisions.last() {
            habit.schedule = latest.schedule.clone();
        }
        let pauses = load_pauses(self.connection, &habit.id)?;
        let logs = load_logs(self.connection, &habit.id)?;
        Ok(HabitAggregate {
            habit,
            revisions,
            pauses,
            logs,
        })
    }

    pub fn set_log(
        &mut self,
        id: &HabitId,
        date: NaiveDate,
        state: Option<HabitLogState>,
    ) -> Result<(), HabitRepositoryError> {
        self.ensure_exists(id)?;
        if let Some(state) = state {
            let now = now_string();
            self.connection.execute(
                "INSERT INTO habit_logs (habit_id, log_date, state, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
                 ON CONFLICT(habit_id, log_date) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at",
                params![id.as_str(), format_date(date), log_state_to_str(state), now],
            )?;
        } else {
            self.connection.execute(
                "DELETE FROM habit_logs WHERE habit_id = ?1 AND log_date = ?2",
                params![id.as_str(), format_date(date)],
            )?;
        }
        Ok(())
    }

    pub fn pause(&mut self, id: &HabitId, today: NaiveDate) -> Result<(), HabitRepositoryError> {
        let status = self.status(id)?;
        if status == HabitStatus::Archived {
            return Err(HabitRepositoryError::NotFound);
        }
        if status == HabitStatus::Paused {
            return Ok(());
        }
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "UPDATE habits SET status = 'paused', updated_at = ?2 WHERE id = ?1",
            params![id.as_str(), now_string()],
        )?;
        open_pause(&transaction, id, today)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn resume(&mut self, id: &HabitId, today: NaiveDate) -> Result<(), HabitRepositoryError> {
        if self.status(id)? != HabitStatus::Paused {
            return Ok(());
        }
        let transaction = self.connection.transaction()?;
        close_pause(&transaction, id, today)?;
        transaction.execute(
            "UPDATE habits SET status = 'active', updated_at = ?2 WHERE id = ?1",
            params![id.as_str(), now_string()],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn archive(&mut self, id: &HabitId, today: NaiveDate) -> Result<(), HabitRepositoryError> {
        let status = self.status(id)?;
        if status == HabitStatus::Archived {
            return Ok(());
        }
        let transaction = self.connection.transaction()?;
        if status == HabitStatus::Active {
            open_pause(&transaction, id, today)?;
        }
        transaction.execute(
            "UPDATE habits SET status = 'archived', paused_before_archive = ?2, updated_at = ?3 WHERE id = ?1",
            params![id.as_str(), i64::from(status == HabitStatus::Paused), now_string()],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn restore(&mut self, id: &HabitId, today: NaiveDate) -> Result<(), HabitRepositoryError> {
        let was_paused: Option<i64> = self
            .connection
            .query_row(
                "SELECT paused_before_archive FROM habits WHERE id = ?1 AND status = 'archived'",
                [id.as_str()],
                |row| row.get(0),
            )
            .optional()?;
        let was_paused = was_paused.ok_or(HabitRepositoryError::NotFound)? != 0;
        let transaction = self.connection.transaction()?;
        if !was_paused {
            close_pause(&transaction, id, today)?;
        }
        transaction.execute(
            "UPDATE habits SET status = ?2, paused_before_archive = 0,
             position = (SELECT COALESCE(MAX(position), -1) + 1 FROM habits AS ordered WHERE ordered.status <> 'archived'),
             updated_at = ?3 WHERE id = ?1",
            params![id.as_str(), if was_paused { "paused" } else { "active" }, now_string()],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn delete_archived(&mut self, id: &HabitId) -> Result<(), HabitRepositoryError> {
        let changed = self.connection.execute(
            "DELETE FROM habits WHERE id = ?1 AND status = 'archived'",
            [id.as_str()],
        )?;
        if changed == 0 {
            return Err(HabitRepositoryError::MustBeArchived);
        }
        Ok(())
    }

    pub fn reorder(&mut self, ids: &[HabitId]) -> Result<(), HabitRepositoryError> {
        let stored = {
            let mut statement = self.connection.prepare(
                "SELECT id FROM habits WHERE status <> 'archived' ORDER BY position, id",
            )?;
            let rows = statement
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };
        let received: Vec<_> = ids.iter().map(HabitId::as_str).collect();
        if stored.len() != received.len()
            || stored.iter().any(|id| !received.contains(&id.as_str()))
        {
            return Err(HabitRepositoryError::InvalidOrder);
        }
        let transaction = self.connection.transaction()?;
        for (position, id) in ids.iter().enumerate() {
            transaction.execute(
                "UPDATE habits SET position = ?2, updated_at = ?3 WHERE id = ?1",
                params![id.as_str(), position as u32, now_string()],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    fn ensure_exists(&self, id: &HabitId) -> Result<(), HabitRepositoryError> {
        let found = self
            .connection
            .query_row(
                "SELECT 1 FROM habits WHERE id = ?1 AND status <> 'archived'",
                [id.as_str()],
                |_| Ok(()),
            )
            .optional()?;
        found.ok_or(HabitRepositoryError::NotFound)
    }

    fn status(&self, id: &HabitId) -> Result<HabitStatus, HabitRepositoryError> {
        let value = self
            .connection
            .query_row(
                "SELECT status FROM habits WHERE id = ?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or(HabitRepositoryError::NotFound)?;
        status_from_str(&value)
    }
}

fn insert_schedule(
    transaction: &Transaction<'_>,
    habit_id: &str,
    effective_from: NaiveDate,
    schedule: &Schedule,
) -> Result<(), HabitRepositoryError> {
    let (kind, target, legacy_start_day, weekdays, month_days): (
        &str,
        Option<u8>,
        Option<u8>,
        &[u8],
        &[u8],
    ) = match schedule {
        Schedule::Daily => ("daily", None, None, &[], &[]),
        Schedule::SpecificWeekdays { weekdays } => ("specific_weekdays", None, None, weekdays, &[]),
        Schedule::WeeklyTarget {
            target,
            preferred_weekdays,
        } => (
            "weekly_target",
            Some(*target),
            None,
            preferred_weekdays,
            &[],
        ),
        Schedule::MonthlyTarget {
            target,
            preferred_days,
        } => (
            "monthly_target",
            Some(*target),
            preferred_days.first().copied(),
            &[],
            preferred_days,
        ),
    };
    transaction.execute(
        "INSERT INTO habit_schedule_revisions (habit_id, effective_from, schedule_type, target_count, monthly_start_day)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(habit_id, effective_from) DO UPDATE SET schedule_type = excluded.schedule_type, target_count = excluded.target_count, monthly_start_day = excluded.monthly_start_day",
        params![habit_id, format_date(effective_from), kind, target, legacy_start_day],
    )?;
    let revision_id: i64 = transaction.query_row(
        "SELECT id FROM habit_schedule_revisions WHERE habit_id = ?1 AND effective_from = ?2",
        params![habit_id, format_date(effective_from)],
        |row| row.get(0),
    )?;
    transaction.execute(
        "DELETE FROM habit_schedule_weekdays WHERE schedule_revision_id = ?1",
        [revision_id],
    )?;
    for (position, weekday) in weekdays.iter().enumerate() {
        transaction.execute("INSERT INTO habit_schedule_weekdays (schedule_revision_id, weekday, position) VALUES (?1, ?2, ?3)", params![revision_id, weekday, position as u32])?;
    }
    transaction.execute(
        "DELETE FROM habit_schedule_month_days WHERE schedule_revision_id = ?1",
        [revision_id],
    )?;
    for (position, month_day) in month_days.iter().enumerate() {
        transaction.execute(
            "INSERT INTO habit_schedule_month_days (schedule_revision_id, month_day, position) VALUES (?1, ?2, ?3)",
            params![revision_id, month_day, position as u32],
        )?;
    }
    Ok(())
}

fn load_revisions(
    connection: &Connection,
    id: &HabitId,
) -> Result<Vec<ScheduleRevision>, HabitRepositoryError> {
    let mut statement = connection.prepare(
        "SELECT id, effective_from, schedule_type, target_count, monthly_start_day FROM habit_schedule_revisions WHERE habit_id = ?1 ORDER BY effective_from, id"
    )?;
    let raw = statement
        .query_map([id.as_str()], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<u8>>(3)?,
                row.get::<_, Option<u8>>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    raw.into_iter()
        .map(|(revision_id, date, kind, target, start)| {
            let weekdays = load_weekdays(connection, revision_id)?;
            let mut month_days = load_month_days(connection, revision_id)?;
            if month_days.is_empty() {
                if let Some(start) = start {
                    month_days.push(start);
                }
            }
            let schedule = match kind.as_str() {
                "daily" => Schedule::Daily,
                "specific_weekdays" => Schedule::SpecificWeekdays { weekdays },
                "weekly_target" => Schedule::WeeklyTarget {
                    target: target
                        .ok_or(HabitRepositoryError::InvalidStoredValue("target_count"))?,
                    preferred_weekdays: weekdays,
                },
                "monthly_target" => Schedule::MonthlyTarget {
                    target: target
                        .ok_or(HabitRepositoryError::InvalidStoredValue("target_count"))?,
                    preferred_days: month_days,
                },
                _ => return Err(HabitRepositoryError::InvalidStoredValue("schedule_type")),
            }
            .validate()?;
            Ok(ScheduleRevision {
                effective_from: parse_date(&date)?,
                schedule,
            })
        })
        .collect()
}

fn load_weekdays(
    connection: &Connection,
    revision_id: i64,
) -> Result<Vec<u8>, HabitRepositoryError> {
    let mut statement = connection.prepare("SELECT weekday FROM habit_schedule_weekdays WHERE schedule_revision_id = ?1 ORDER BY position")?;
    let weekdays = statement
        .query_map([revision_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(weekdays)
}

fn load_month_days(
    connection: &Connection,
    revision_id: i64,
) -> Result<Vec<u8>, HabitRepositoryError> {
    let mut statement = connection.prepare(
        "SELECT month_day FROM habit_schedule_month_days WHERE schedule_revision_id = ?1 ORDER BY position",
    )?;
    let days = statement
        .query_map([revision_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(days)
}

fn load_pauses(
    connection: &Connection,
    id: &HabitId,
) -> Result<Vec<PauseInterval>, HabitRepositoryError> {
    let mut statement = connection.prepare("SELECT starts_on, ends_on FROM habit_pause_intervals WHERE habit_id = ?1 ORDER BY starts_on")?;
    let raw = statement
        .query_map([id.as_str()], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    raw.into_iter()
        .map(|(start, end)| {
            Ok(PauseInterval {
                starts_on: parse_date(&start)?,
                ends_on: end.map(|value| parse_date(&value)).transpose()?,
            })
        })
        .collect()
}

fn load_logs(
    connection: &Connection,
    id: &HabitId,
) -> Result<BTreeMap<NaiveDate, HabitLogState>, HabitRepositoryError> {
    let mut statement = connection
        .prepare("SELECT log_date, state FROM habit_logs WHERE habit_id = ?1 ORDER BY log_date")?;
    let raw = statement
        .query_map([id.as_str()], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    raw.into_iter()
        .map(|(date, state)| Ok((parse_date(&date)?, log_state_from_str(&state)?)))
        .collect()
}

fn open_pause(
    transaction: &Transaction<'_>,
    id: &HabitId,
    today: NaiveDate,
) -> Result<(), HabitRepositoryError> {
    let exists = transaction
        .query_row(
            "SELECT 1 FROM habit_pause_intervals WHERE habit_id = ?1 AND ends_on IS NULL",
            [id.as_str()],
            |_| Ok(()),
        )
        .optional()?
        .is_some();
    if !exists {
        transaction.execute(
            "INSERT INTO habit_pause_intervals (habit_id, starts_on) VALUES (?1, ?2)",
            params![id.as_str(), format_date(today)],
        )?;
    }
    Ok(())
}

fn close_pause(
    transaction: &Transaction<'_>,
    id: &HabitId,
    today: NaiveDate,
) -> Result<(), HabitRepositoryError> {
    transaction.execute(
        "UPDATE habit_pause_intervals SET ends_on = ?2 WHERE habit_id = ?1 AND ends_on IS NULL",
        params![id.as_str(), format_date(today)],
    )?;
    transaction.execute(
        "DELETE FROM habit_pause_intervals WHERE habit_id = ?1 AND starts_on = ends_on",
        [id.as_str()],
    )?;
    Ok(())
}

fn habit_from_row(row: &Row<'_>) -> rusqlite::Result<Habit> {
    let id = HabitId::new(row.get::<_, String>(0)?).map_err(domain_sql_error)?;
    let name = row.get(1)?;
    let kind = kind_from_str(&row.get::<_, String>(2)?).map_err(repository_sql_error)?;
    let category = category_from_str(&row.get::<_, String>(3)?).map_err(repository_sql_error)?;
    let icon = icon_from_str(&row.get::<_, String>(4)?).map_err(repository_sql_error)?;
    let status = status_from_str(&row.get::<_, String>(5)?).map_err(repository_sql_error)?;
    let position = row.get(6)?;
    let created_on = parse_date(&row.get::<_, String>(7)?).map_err(repository_sql_error)?;
    let starts_on = parse_date(&row.get::<_, String>(8)?).map_err(repository_sql_error)?;
    Habit::new(
        id,
        name,
        kind,
        category,
        icon,
        status,
        position,
        created_on,
        starts_on,
        Schedule::Daily,
    )
    .map_err(domain_sql_error)
}

fn domain_sql_error(error: HabitError) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}
fn repository_sql_error(error: HabitRepositoryError) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}

pub(crate) fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}
pub(crate) fn format_date(value: NaiveDate) -> String {
    value.format("%Y-%m-%d").to_string()
}
pub(crate) fn parse_date(value: &str) -> Result<NaiveDate, HabitRepositoryError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| HabitRepositoryError::InvalidStoredValue("date"))
}
fn now_string() -> String {
    DateTime::<Utc>::from(std::time::SystemTime::now()).to_rfc3339_opts(SecondsFormat::Secs, true)
}

pub(crate) fn kind_to_str(value: HabitKind) -> &'static str {
    match value {
        HabitKind::Habit => "habit",
        HabitKind::Routine => "routine",
    }
}
pub(crate) fn kind_from_str(value: &str) -> Result<HabitKind, HabitRepositoryError> {
    match value {
        "habit" => Ok(HabitKind::Habit),
        "routine" => Ok(HabitKind::Routine),
        _ => Err(HabitRepositoryError::InvalidStoredValue("kind")),
    }
}
pub(crate) fn category_to_str(value: HabitCategory) -> &'static str {
    match value {
        HabitCategory::Health => "health",
        HabitCategory::Sport => "sport",
        HabitCategory::Learning => "learning",
        HabitCategory::PersonalCare => "personal_care",
        HabitCategory::Home => "home",
        HabitCategory::Organization => "organization",
        HabitCategory::Leisure => "leisure",
        HabitCategory::Other => "other",
    }
}
pub(crate) fn category_from_str(value: &str) -> Result<HabitCategory, HabitRepositoryError> {
    match value {
        "health" => Ok(HabitCategory::Health),
        "sport" => Ok(HabitCategory::Sport),
        "learning" => Ok(HabitCategory::Learning),
        "personal_care" => Ok(HabitCategory::PersonalCare),
        "home" => Ok(HabitCategory::Home),
        "organization" => Ok(HabitCategory::Organization),
        "leisure" => Ok(HabitCategory::Leisure),
        "other" => Ok(HabitCategory::Other),
        _ => Err(HabitRepositoryError::InvalidStoredValue("category")),
    }
}
pub(crate) fn icon_to_str(value: HabitIcon) -> &'static str {
    match value {
        HabitIcon::Check => "check",
        HabitIcon::Book => "book",
        HabitIcon::Languages => "languages",
        HabitIcon::Dumbbell => "dumbbell",
        HabitIcon::Heart => "heart",
        HabitIcon::Sparkles => "sparkles",
        HabitIcon::Home => "home",
        HabitIcon::Battery => "battery",
        HabitIcon::Droplets => "droplets",
        HabitIcon::Moon => "moon",
        HabitIcon::Backpack => "backpack",
        HabitIcon::CalendarRange => "calendar_range",
        HabitIcon::Scissors => "scissors",
        HabitIcon::WashingMachine => "washing_machine",
        HabitIcon::BedDouble => "bed_double",
        HabitIcon::Shirt => "shirt",
        HabitIcon::Razor => "razor",
        HabitIcon::BedSingle => "bed_single",
        HabitIcon::Bath => "bath",
        HabitIcon::Shower => "shower",
    }
}
fn legacy_icon_to_str(value: HabitIcon) -> &'static str {
    match value {
        HabitIcon::Backpack
        | HabitIcon::CalendarRange
        | HabitIcon::Scissors
        | HabitIcon::WashingMachine
        | HabitIcon::BedDouble
        | HabitIcon::Shirt
        | HabitIcon::Razor
        | HabitIcon::BedSingle
        | HabitIcon::Bath
        | HabitIcon::Shower => "check",
        _ => icon_to_str(value),
    }
}
pub(crate) fn icon_from_str(value: &str) -> Result<HabitIcon, HabitRepositoryError> {
    match value {
        "check" => Ok(HabitIcon::Check),
        "book" => Ok(HabitIcon::Book),
        "languages" => Ok(HabitIcon::Languages),
        "dumbbell" => Ok(HabitIcon::Dumbbell),
        "heart" => Ok(HabitIcon::Heart),
        "sparkles" => Ok(HabitIcon::Sparkles),
        "home" => Ok(HabitIcon::Home),
        "battery" => Ok(HabitIcon::Battery),
        "droplets" => Ok(HabitIcon::Droplets),
        "moon" => Ok(HabitIcon::Moon),
        "backpack" => Ok(HabitIcon::Backpack),
        "calendar_range" => Ok(HabitIcon::CalendarRange),
        "scissors" => Ok(HabitIcon::Scissors),
        "washing_machine" => Ok(HabitIcon::WashingMachine),
        "bed_double" => Ok(HabitIcon::BedDouble),
        "shirt" => Ok(HabitIcon::Shirt),
        "razor" => Ok(HabitIcon::Razor),
        "bed_single" => Ok(HabitIcon::BedSingle),
        "bath" => Ok(HabitIcon::Bath),
        "shower" => Ok(HabitIcon::Shower),
        _ => Err(HabitRepositoryError::InvalidStoredValue("icon")),
    }
}
pub(crate) fn status_to_str(value: HabitStatus) -> &'static str {
    match value {
        HabitStatus::Active => "active",
        HabitStatus::Paused => "paused",
        HabitStatus::Archived => "archived",
    }
}
pub(crate) fn status_from_str(value: &str) -> Result<HabitStatus, HabitRepositoryError> {
    match value {
        "active" => Ok(HabitStatus::Active),
        "paused" => Ok(HabitStatus::Paused),
        "archived" => Ok(HabitStatus::Archived),
        _ => Err(HabitRepositoryError::InvalidStoredValue("status")),
    }
}
pub(crate) fn log_state_to_str(value: HabitLogState) -> &'static str {
    match value {
        HabitLogState::Completed => "completed",
        HabitLogState::Skipped => "skipped",
    }
}
pub(crate) fn log_state_from_str(value: &str) -> Result<HabitLogState, HabitRepositoryError> {
    match value {
        "completed" => Ok(HabitLogState::Completed),
        "skipped" => Ok(HabitLogState::Skipped),
        _ => Err(HabitRepositoryError::InvalidStoredValue("log_state")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::repository::apply_migrations;

    fn habit(name: &str, created_on: NaiveDate, schedule: Schedule) -> Habit {
        Habit::new(
            HabitId::generate(),
            name.into(),
            HabitKind::Habit,
            HabitCategory::Learning,
            HabitIcon::Book,
            HabitStatus::Active,
            0,
            created_on,
            created_on,
            schedule,
        )
        .unwrap()
    }

    #[test]
    fn activity_schedule_logs_and_pause_survive_sqlite() {
        let path =
            std::env::temp_dir().join(format!("nubeos-habits-{}.sqlite3", uuid::Uuid::new_v4()));
        let id = {
            let mut connection = Connection::open(&path).unwrap();
            apply_migrations(&mut connection).unwrap();
            let created = NaiveDate::from_ymd_opt(2026, 8, 3).unwrap();
            let value = habit(
                "Estudiar japonés",
                created,
                Schedule::WeeklyTarget {
                    target: 4,
                    preferred_weekdays: vec![1, 3, 5, 6],
                },
            );
            let id = value.id.clone();
            let mut repository = HabitRepository::new(&mut connection);
            repository.create(&value).unwrap();
            repository
                .set_log(
                    &id,
                    NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
                    Some(HabitLogState::Completed),
                )
                .unwrap();
            repository
                .pause(&id, NaiveDate::from_ymd_opt(2026, 8, 10).unwrap())
                .unwrap();
            id
        };
        let mut reopened = Connection::open(&path).unwrap();
        apply_migrations(&mut reopened).unwrap();
        let restored = HabitRepository::new(&mut reopened)
            .find_aggregate(&id)
            .unwrap();
        assert_eq!(restored.habit.name, "Estudiar japonés");
        assert_eq!(restored.habit.status, HabitStatus::Paused);
        assert_eq!(restored.logs.len(), 1);
        assert!(restored.is_paused_on(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap()));
        drop(reopened);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn schedule_revision_preserves_the_previous_configuration() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let created = NaiveDate::from_ymd_opt(2026, 8, 3).unwrap();
        let mut value = habit("Leer", created, Schedule::Daily);
        let id = value.id.clone();
        let mut repository = HabitRepository::new(&mut connection);
        repository.create(&value).unwrap();
        value.schedule = Schedule::SpecificWeekdays {
            weekdays: vec![1, 3, 5],
        };
        repository
            .update(&value, NaiveDate::from_ymd_opt(2026, 8, 10).unwrap())
            .unwrap();
        let restored = repository.find_aggregate(&id).unwrap();
        assert!(matches!(
            restored.schedule_at(NaiveDate::from_ymd_opt(2026, 8, 9).unwrap()),
            Some(Schedule::Daily)
        ));
        assert!(matches!(
            restored.schedule_at(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap()),
            Some(Schedule::SpecificWeekdays { .. })
        ));
    }

    #[test]
    fn permanent_delete_requires_archive_and_cascades_history() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let today = NaiveDate::from_ymd_opt(2026, 8, 14).unwrap();
        let value = habit(
            "Cargar cascos",
            today,
            Schedule::WeeklyTarget {
                target: 1,
                preferred_weekdays: vec![5],
            },
        );
        let id = value.id.clone();
        let mut repository = HabitRepository::new(&mut connection);
        repository.create(&value).unwrap();
        repository
            .set_log(&id, today, Some(HabitLogState::Completed))
            .unwrap();
        assert!(matches!(
            repository.delete_archived(&id),
            Err(HabitRepositoryError::MustBeArchived)
        ));
        repository.archive(&id, today).unwrap();
        repository.delete_archived(&id).unwrap();
        let rows: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM habit_logs WHERE habit_id = ?1",
                [id.as_str()],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(rows, 0);
    }

    #[test]
    fn refinement_migration_preserves_start_icon_and_month_day() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!("../../migrations/0010_create_habits.sql"))
            .unwrap();
        connection
            .execute_batch(
                "INSERT INTO habits
                 (id, name, normalized_name, kind, category, icon, status, position, created_on, created_at, updated_at)
                 VALUES ('habit', 'Cambiar sábanas', 'cambiar sábanas', 'routine', 'home', 'home', 'active', 0, '2026-08-15', 'now', 'now');
                 INSERT INTO habit_schedule_revisions
                 (habit_id, effective_from, schedule_type, target_count, monthly_start_day)
                 VALUES ('habit', '2026-08-15', 'monthly_target', 2, 15);",
            )
            .unwrap();

        connection
            .execute_batch(include_str!(
                "../../migrations/0011_refine_habits_tracking.sql"
            ))
            .unwrap();

        let values: (String, String) = connection
            .query_row(
                "SELECT starts_on, icon_key FROM habits WHERE id = 'habit'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(values, ("2026-08-15".into(), "home".into()));
        assert_eq!(
            connection
                .query_row(
                    "SELECT month_day FROM habit_schedule_month_days",
                    [],
                    |row| row.get::<_, u8>(0),
                )
                .unwrap(),
            15
        );
    }

    #[test]
    fn start_date_is_locked_after_the_first_log() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let today = NaiveDate::from_ymd_opt(2026, 8, 15).unwrap();
        let mut value = habit("Preparar mochila", today, Schedule::Daily);
        let id = value.id.clone();
        let mut repository = HabitRepository::new(&mut connection);
        repository.create(&value).unwrap();
        repository
            .set_log(&id, today, Some(HabitLogState::Completed))
            .unwrap();
        value.starts_on = NaiveDate::from_ymd_opt(2026, 8, 17).unwrap();

        assert!(matches!(
            repository.update(&value, today),
            Err(HabitRepositoryError::StartDateLocked)
        ));
    }

    #[test]
    fn new_icons_and_multiple_month_days_survive_sqlite() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let today = NaiveDate::from_ymd_opt(2026, 8, 15).unwrap();
        let mut value = habit(
            "Cambiar sábanas",
            today,
            Schedule::MonthlyTarget {
                target: 2,
                preferred_days: vec![1, 15],
            },
        );
        value.icon = HabitIcon::BedSingle;
        let id = value.id.clone();
        let mut repository = HabitRepository::new(&mut connection);
        repository.create(&value).unwrap();

        let restored = repository.find_aggregate(&id).unwrap();
        assert_eq!(restored.habit.icon, HabitIcon::BedSingle);
        assert!(matches!(
            restored.habit.schedule,
            Schedule::MonthlyTarget {
                preferred_days,
                ..
            } if preferred_days == vec![1, 15]
        ));
    }
}
