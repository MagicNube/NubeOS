//! Evaluación de calendario, progreso y estadísticas de Hábitos.

use std::collections::BTreeSet;

use chrono::{Datelike, Duration, NaiveDate};

use super::model::{HabitAggregate, HabitLogState, Schedule};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverviewKind {
    Day,
    Week,
    Month,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatisticsPeriod {
    Week,
    Month,
    Year,
    All,
    Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StatisticsWindow {
    pub start: NaiveDate,
    pub end: NaiveDate,
}

#[derive(Debug, Clone)]
pub struct Overview {
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub today: NaiveDate,
    pub rows: Vec<OverviewRow>,
}

#[derive(Debug, Clone)]
pub struct OverviewRow {
    pub habit_index: usize,
    pub cells: Vec<OverviewCell>,
    pub progress: Progress,
    pub last_completed_on: Option<NaiveDate>,
    pub next_due_on: Option<NaiveDate>,
}

#[derive(Debug, Clone)]
pub struct OverviewCell {
    pub date: NaiveDate,
    pub applicable: bool,
    pub preferred: bool,
    pub state: Option<HabitLogState>,
    pub can_edit: bool,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Progress {
    pub completed: u32,
    pub target: u32,
    pub effective_target: u32,
    pub neutral: bool,
    pub partial: bool,
}

#[derive(Debug, Clone)]
pub struct HabitStatistics {
    pub habit_index: usize,
    pub completed_count: u32,
    pub effective_opportunities: u32,
    pub completion_rate: f64,
    pub current_streak: u32,
    pub best_streak: u32,
    pub streak_unit: StreakUnit,
    pub current_progress: Progress,
    pub last_completed_on: Option<NaiveDate>,
    pub sample_size: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreakUnit {
    Day,
    Week,
    Month,
}

#[derive(Debug, Clone)]
pub struct StatisticsOverview {
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub items: Vec<HabitStatistics>,
    pub average_completion_rate: f64,
    pub most_consistent_index: Option<usize>,
    pub needs_attention_index: Option<usize>,
}

pub fn build_overview(
    aggregates: &[HabitAggregate],
    kind: OverviewKind,
    anchor: NaiveDate,
    today: NaiveDate,
) -> Overview {
    let (start, end) = match kind {
        OverviewKind::Day => (anchor, anchor),
        OverviewKind::Week => week_bounds(anchor),
        OverviewKind::Month => month_bounds(anchor),
    };
    let mut rows = Vec::new();
    for (habit_index, aggregate) in aggregates.iter().enumerate() {
        let cells: Vec<_> = dates(start, end)
            .map(|date| cell_for(aggregate, date, today))
            .collect();
        let progress = progress_for_span(aggregate, start, end);
        let visible = match kind {
            OverviewKind::Day => cells.first().is_some_and(|cell| {
                cell.state.is_some() || (cell.applicable && day_item_is_due(aggregate, cell.date))
            }),
            _ => cells
                .iter()
                .any(|cell| cell.applicable || cell.state.is_some()),
        };
        if !visible {
            continue;
        }
        rows.push(OverviewRow {
            habit_index,
            cells,
            progress,
            last_completed_on: last_completed(aggregate, today),
            next_due_on: next_due(aggregate, today),
        });
    }
    Overview {
        start,
        end,
        today,
        rows,
    }
}

pub fn validate_log_date(
    aggregate: &HabitAggregate,
    date: NaiveDate,
    today: NaiveDate,
) -> Result<(), &'static str> {
    if date > today {
        return Err("No se puede modificar una fecha futura.");
    }
    if !is_applicable(aggregate, date) {
        return Err("La actividad no corresponde a esa fecha.");
    }
    Ok(())
}

pub fn resolve_statistics_window(
    period: StatisticsPeriod,
    custom_start: Option<NaiveDate>,
    custom_end: Option<NaiveDate>,
    today: NaiveDate,
    earliest_start: Option<NaiveDate>,
) -> Result<StatisticsWindow, &'static str> {
    let (start, end) = match period {
        StatisticsPeriod::Week => week_bounds(today),
        StatisticsPeriod::Month => month_bounds(today),
        StatisticsPeriod::Year => (
            NaiveDate::from_ymd_opt(today.year(), 1, 1).expect("año de chrono válido"),
            today,
        ),
        StatisticsPeriod::All => (
            earliest_start
                .filter(|start| *start <= today)
                .unwrap_or(today),
            today,
        ),
        StatisticsPeriod::Custom => {
            let start = custom_start.ok_or("Indica la fecha inicial del intervalo.")?;
            let end = custom_end.ok_or("Indica la fecha final del intervalo.")?;
            if start > end {
                return Err("La fecha inicial no puede ser posterior a la final.");
            }
            if start > today {
                return Err("El intervalo estadístico no puede empezar en el futuro.");
            }
            (start, end.min(today))
        }
    };
    Ok(StatisticsWindow {
        start,
        end: end.min(today),
    })
}

pub fn build_statistics(
    aggregates: &[HabitAggregate],
    window: StatisticsWindow,
) -> StatisticsOverview {
    let items: Vec<_> = aggregates
        .iter()
        .enumerate()
        .filter(|(_, aggregate)| aggregate.habit.starts_on <= window.end)
        .map(|(index, aggregate)| statistics_for(aggregate, index, window))
        .collect();
    let eligible: Vec<_> = items
        .iter()
        .filter(|item| item.sample_size >= minimum_sample(item.streak_unit))
        .collect();
    let average_completion_rate = if items.is_empty() {
        0.0
    } else {
        items.iter().map(|item| item.completion_rate).sum::<f64>() / items.len() as f64
    };
    let most_consistent_index = eligible
        .iter()
        .max_by(|left, right| left.completion_rate.total_cmp(&right.completion_rate))
        .map(|item| item.habit_index);
    let needs_attention_index = eligible
        .iter()
        .min_by(|left, right| left.completion_rate.total_cmp(&right.completion_rate))
        .map(|item| item.habit_index);
    StatisticsOverview {
        start: window.start,
        end: window.end,
        items,
        average_completion_rate,
        most_consistent_index,
        needs_attention_index,
    }
}

fn statistics_for(
    aggregate: &HabitAggregate,
    habit_index: usize,
    window: StatisticsWindow,
) -> HabitStatistics {
    let start = window.start.max(aggregate.habit.starts_on);
    let end = window.end;
    let current_schedule = aggregate
        .schedule_at(end)
        .unwrap_or(&aggregate.habit.schedule);
    let unit = match current_schedule {
        Schedule::Daily | Schedule::SpecificWeekdays { .. } => StreakUnit::Day,
        Schedule::WeeklyTarget { .. } => StreakUnit::Week,
        Schedule::MonthlyTarget { .. } => StreakUnit::Month,
    };
    let (completed, opportunities, current_streak, best_streak, sample_size) = if start > end {
        (0, 0, 0, 0, 0)
    } else {
        match unit {
            StreakUnit::Day => daily_statistics(aggregate, start, end),
            StreakUnit::Week => period_statistics(aggregate, start, end, StreakUnit::Week),
            StreakUnit::Month => period_statistics(aggregate, start, end, StreakUnit::Month),
        }
    };
    let (period_start, period_end) = match unit {
        StreakUnit::Day => (end, end),
        StreakUnit::Week => week_bounds(end),
        StreakUnit::Month => month_bounds(end),
    };
    HabitStatistics {
        habit_index,
        completed_count: aggregate
            .logs
            .iter()
            .filter(|(date, state)| {
                start <= **date && **date <= end && **state == HabitLogState::Completed
            })
            .count() as u32,
        effective_opportunities: opportunities,
        completion_rate: if opportunities == 0 {
            0.0
        } else {
            completed as f64 * 100.0 / opportunities as f64
        },
        current_streak,
        best_streak,
        streak_unit: unit,
        current_progress: progress_for_single_period(
            aggregate,
            period_start.max(start),
            period_end.min(end),
        ),
        last_completed_on: last_completed_between(aggregate, start, end),
        sample_size,
    }
}

fn daily_statistics(
    aggregate: &HabitAggregate,
    start: NaiveDate,
    end: NaiveDate,
) -> (u32, u32, u32, u32, u32) {
    let mut completed_total = 0;
    let mut opportunities = 0;
    let mut streak = 0;
    let mut best = 0;
    for date in dates(start, end) {
        if !is_strict_opportunity(aggregate, date) {
            continue;
        }
        match aggregate.logs.get(&date) {
            Some(HabitLogState::Completed) => {
                completed_total += 1;
                opportunities += 1;
                streak += 1;
                best = best.max(streak);
            }
            Some(HabitLogState::Skipped) => {}
            None if date == end => {
                opportunities += 1;
            }
            None => {
                opportunities += 1;
                streak = 0;
            }
        }
    }
    (completed_total, opportunities, streak, best, opportunities)
}

fn period_statistics(
    aggregate: &HabitAggregate,
    start: NaiveDate,
    end: NaiveDate,
    unit: StreakUnit,
) -> (u32, u32, u32, u32, u32) {
    let mut cursor = match unit {
        StreakUnit::Week => week_bounds(start).0,
        StreakUnit::Month => month_bounds(start).0,
        StreakUnit::Day => unreachable!(),
    };
    let current_start = match unit {
        StreakUnit::Week => week_bounds(end).0,
        StreakUnit::Month => month_bounds(end).0,
        StreakUnit::Day => unreachable!(),
    };
    let mut completed_total = 0;
    let mut target_total = 0;
    let mut streak = 0;
    let mut best = 0;
    let mut samples = 0;
    while cursor <= current_start {
        let period_end = match unit {
            StreakUnit::Week => cursor + Duration::days(6),
            StreakUnit::Month => month_bounds(cursor).1,
            StreakUnit::Day => unreachable!(),
        };
        let progress =
            progress_for_single_period(aggregate, cursor.max(start), period_end.min(end));
        if !progress.neutral {
            samples += 1;
            completed_total += progress.completed.min(progress.effective_target);
            target_total += progress.effective_target;
            if progress.completed >= progress.effective_target {
                streak += 1;
                best = best.max(streak);
            } else if cursor != current_start {
                streak = 0;
            }
        }
        cursor = match unit {
            StreakUnit::Week => cursor + Duration::days(7),
            StreakUnit::Month => next_month(cursor),
            StreakUnit::Day => unreachable!(),
        };
    }
    (completed_total, target_total, streak, best, samples)
}

fn progress_for_span(aggregate: &HabitAggregate, start: NaiveDate, end: NaiveDate) -> Progress {
    let mut keys = BTreeSet::new();
    for date in dates(start, end) {
        if date < aggregate.habit.starts_on {
            continue;
        }
        let Some(schedule) = aggregate.schedule_at(date) else {
            continue;
        };
        match schedule {
            Schedule::Daily | Schedule::SpecificWeekdays { .. } => {
                keys.insert(PeriodKey::Day(date));
            }
            Schedule::WeeklyTarget { .. } => {
                keys.insert(PeriodKey::Week(week_bounds(date).0));
            }
            Schedule::MonthlyTarget { .. } => {
                keys.insert(PeriodKey::Month(month_bounds(date).0));
            }
        }
    }
    keys.into_iter()
        .map(|key| match key {
            PeriodKey::Day(date) => progress_for_single_period(aggregate, date, date),
            PeriodKey::Week(date) => {
                progress_for_single_period(aggregate, date, date + Duration::days(6))
            }
            PeriodKey::Month(date) => {
                progress_for_single_period(aggregate, date, month_bounds(date).1)
            }
        })
        .fold(Progress::default(), |mut total, progress| {
            total.completed += progress.completed;
            total.target += progress.target;
            total.effective_target += progress.effective_target;
            total.neutral = total.effective_target == 0;
            total.partial |= progress.partial;
            total
        })
}

fn progress_for_single_period(
    aggregate: &HabitAggregate,
    start: NaiveDate,
    end: NaiveDate,
) -> Progress {
    let partial = start < aggregate.habit.starts_on && aggregate.habit.starts_on <= end;
    let Some(schedule) = aggregate
        .schedule_at(end)
        .or_else(|| aggregate.schedule_at(start))
    else {
        return Progress {
            neutral: true,
            ..Progress::default()
        };
    };
    match schedule {
        Schedule::Daily | Schedule::SpecificWeekdays { .. } => {
            let applicable: Vec<_> = dates(start, end)
                .filter(|date| is_strict_opportunity(aggregate, *date))
                .collect();
            let skipped = applicable
                .iter()
                .filter(|date| aggregate.logs.get(date) == Some(&HabitLogState::Skipped))
                .count() as u32;
            let completed = applicable
                .iter()
                .filter(|date| aggregate.logs.get(date) == Some(&HabitLogState::Completed))
                .count() as u32;
            let target = applicable.len() as u32;
            Progress {
                completed,
                target,
                effective_target: target.saturating_sub(skipped),
                neutral: target == skipped,
                partial,
            }
        }
        Schedule::WeeklyTarget { target, .. } | Schedule::MonthlyTarget { target, .. } => {
            let active_dates: Vec<_> = dates(start, end)
                .filter(|date| is_applicable(aggregate, *date))
                .collect();
            if active_dates.is_empty() {
                return Progress {
                    neutral: true,
                    ..Progress::default()
                };
            }
            let completed = active_dates
                .iter()
                .filter(|date| aggregate.logs.get(date) == Some(&HabitLogState::Completed))
                .count() as u32;
            let skipped = active_dates
                .iter()
                .filter(|date| aggregate.logs.get(date) == Some(&HabitLogState::Skipped))
                .count() as u32;
            let target = u32::from(*target);
            let capacity = active_dates.len() as u32;
            let effective_target = target.min(capacity).saturating_sub(skipped.min(target));
            Progress {
                completed,
                target,
                effective_target,
                neutral: effective_target == 0,
                partial,
            }
        }
    }
}

fn cell_for(aggregate: &HabitAggregate, date: NaiveDate, today: NaiveDate) -> OverviewCell {
    let applicable = is_applicable(aggregate, date);
    let preferred = aggregate
        .schedule_at(date)
        .is_some_and(|schedule| match schedule {
            Schedule::WeeklyTarget {
                preferred_weekdays, ..
            } => preferred_weekdays.contains(&(date.weekday().number_from_monday() as u8)),
            Schedule::MonthlyTarget { preferred_days, .. } => {
                preferred_days.contains(&(date.day() as u8))
            }
            _ => false,
        });
    OverviewCell {
        date,
        applicable,
        preferred,
        state: aggregate.logs.get(&date).copied(),
        can_edit: applicable && date <= today,
    }
}

fn is_applicable(aggregate: &HabitAggregate, date: NaiveDate) -> bool {
    if date < aggregate.habit.starts_on || aggregate.is_paused_on(date) {
        return false;
    }
    let Some(schedule) = aggregate.schedule_at(date) else {
        return false;
    };
    match schedule {
        Schedule::Daily => true,
        Schedule::SpecificWeekdays { weekdays } => {
            weekdays.contains(&(date.weekday().number_from_monday() as u8))
        }
        Schedule::WeeklyTarget { .. } => true,
        Schedule::MonthlyTarget { .. } => true,
    }
}

fn is_strict_opportunity(aggregate: &HabitAggregate, date: NaiveDate) -> bool {
    if !is_applicable(aggregate, date) {
        return false;
    }
    matches!(
        aggregate.schedule_at(date),
        Some(Schedule::Daily | Schedule::SpecificWeekdays { .. })
    )
}

fn day_item_is_due(aggregate: &HabitAggregate, date: NaiveDate) -> bool {
    let Some(schedule) = aggregate.schedule_at(date) else {
        return false;
    };
    match schedule {
        Schedule::Daily | Schedule::SpecificWeekdays { .. } => true,
        Schedule::WeeklyTarget { .. } => {
            let (start, end) = week_bounds(date);
            let progress = progress_for_single_period(aggregate, start, end);
            progress.completed < progress.effective_target
        }
        Schedule::MonthlyTarget {
            target,
            preferred_days,
        } => {
            let (start, end) = month_bounds(date);
            let progress = progress_for_single_period(aggregate, start, end);
            progress.completed
                < monthly_due_target(*target, preferred_days, date.day() as u8)
                    .min(progress.effective_target)
        }
    }
}

fn last_completed(aggregate: &HabitAggregate, today: NaiveDate) -> Option<NaiveDate> {
    aggregate
        .logs
        .iter()
        .rev()
        .find(|(date, state)| **date <= today && **state == HabitLogState::Completed)
        .map(|(date, _)| *date)
}

fn last_completed_between(
    aggregate: &HabitAggregate,
    start: NaiveDate,
    end: NaiveDate,
) -> Option<NaiveDate> {
    aggregate
        .logs
        .iter()
        .rev()
        .find(|(date, state)| {
            start <= **date && **date <= end && **state == HabitLogState::Completed
        })
        .map(|(date, _)| *date)
}

fn monthly_due_target(target: u8, preferred_days: &[u8], current_day: u8) -> u32 {
    if preferred_days.is_empty() {
        return u32::from(target);
    }
    let reached = preferred_days
        .iter()
        .filter(|day| **day <= current_day)
        .count() as u32;
    if reached == preferred_days.len() as u32 {
        u32::from(target)
    } else {
        reached
    }
}

fn next_due(aggregate: &HabitAggregate, today: NaiveDate) -> Option<NaiveDate> {
    dates(today, today + Duration::days(400)).find(|date| {
        is_applicable(aggregate, *date)
            && aggregate.logs.get(date) != Some(&HabitLogState::Completed)
            && day_item_is_due(aggregate, *date)
    })
}

fn minimum_sample(unit: StreakUnit) -> u32 {
    match unit {
        StreakUnit::Day => 7,
        StreakUnit::Week | StreakUnit::Month => 3,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum PeriodKey {
    Day(NaiveDate),
    Week(NaiveDate),
    Month(NaiveDate),
}

pub fn week_bounds(date: NaiveDate) -> (NaiveDate, NaiveDate) {
    let start = date - Duration::days(i64::from(date.weekday().num_days_from_monday()));
    (start, start + Duration::days(6))
}

pub fn month_bounds(date: NaiveDate) -> (NaiveDate, NaiveDate) {
    let start =
        NaiveDate::from_ymd_opt(date.year(), date.month(), 1).expect("mes de chrono válido");
    (start, next_month(start) - Duration::days(1))
}

fn next_month(date: NaiveDate) -> NaiveDate {
    let (year, month) = if date.month() == 12 {
        (date.year() + 1, 1)
    } else {
        (date.year(), date.month() + 1)
    };
    NaiveDate::from_ymd_opt(year, month, 1).expect("mes de chrono válido")
}

fn dates(start: NaiveDate, end: NaiveDate) -> impl Iterator<Item = NaiveDate> {
    let count = if end < start {
        0
    } else {
        (end - start).num_days() + 1
    };
    (0..count).map(move |offset| start + Duration::days(offset))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::habits::model::{
        Habit, HabitCategory, HabitIcon, HabitId, HabitKind, HabitStatus, ScheduleRevision,
    };
    use std::collections::BTreeMap;

    fn aggregate(schedule: Schedule) -> HabitAggregate {
        let created = NaiveDate::from_ymd_opt(2026, 8, 3).unwrap();
        HabitAggregate {
            habit: Habit::new(
                HabitId::generate(),
                "Entrenar".into(),
                HabitKind::Habit,
                HabitCategory::Sport,
                HabitIcon::Dumbbell,
                HabitStatus::Active,
                0,
                created,
                created,
                schedule.clone(),
            )
            .unwrap(),
            revisions: vec![ScheduleRevision {
                effective_from: created,
                schedule,
            }],
            pauses: vec![],
            logs: BTreeMap::new(),
        }
    }

    #[test]
    fn flexible_week_accepts_different_days_and_skip_reduces_target() {
        let mut item = aggregate(Schedule::WeeklyTarget {
            target: 4,
            preferred_weekdays: vec![1, 3, 5, 6],
        });
        for day in [3, 4, 6] {
            item.logs.insert(
                NaiveDate::from_ymd_opt(2026, 8, day).unwrap(),
                HabitLogState::Completed,
            );
        }
        item.logs.insert(
            NaiveDate::from_ymd_opt(2026, 8, 7).unwrap(),
            HabitLogState::Skipped,
        );
        let progress = progress_for_single_period(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap(),
            NaiveDate::from_ymd_opt(2026, 8, 9).unwrap(),
        );
        assert_eq!(progress.completed, 3);
        assert_eq!(progress.effective_target, 3);
    }

    #[test]
    fn strict_weekdays_do_not_accept_a_replacement_day() {
        let item = aggregate(Schedule::SpecificWeekdays {
            weekdays: vec![1, 3, 5],
        });
        assert!(is_applicable(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 5).unwrap()
        ));
        assert!(!is_applicable(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 6).unwrap()
        ));
    }

    #[test]
    fn monday_is_the_first_day_of_the_week() {
        assert_eq!(
            week_bounds(NaiveDate::from_ymd_opt(2026, 8, 6).unwrap()).0,
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap()
        );
    }

    #[test]
    fn a_weekly_activity_started_on_saturday_has_a_partial_first_week() {
        let mut item = aggregate(Schedule::WeeklyTarget {
            target: 4,
            preferred_weekdays: vec![1, 3, 5, 6],
        });
        item.habit.starts_on = NaiveDate::from_ymd_opt(2026, 8, 8).unwrap();
        item.revisions[0].effective_from = item.habit.starts_on;

        let progress = progress_for_single_period(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 3).unwrap(),
            NaiveDate::from_ymd_opt(2026, 8, 9).unwrap(),
        );

        assert_eq!(progress.effective_target, 2);
        assert!(progress.partial);
    }

    #[test]
    fn monthly_days_unlock_each_expected_completion_without_blocking_early_logs() {
        let item = aggregate(Schedule::MonthlyTarget {
            target: 2,
            preferred_days: vec![10, 20],
        });
        let early_date = NaiveDate::from_ymd_opt(2026, 8, 5).unwrap();

        assert!(is_applicable(&item, early_date));
        assert!(validate_log_date(&item, early_date, early_date).is_ok());
        assert!(!day_item_is_due(&item, early_date));
        assert!(day_item_is_due(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 10).unwrap()
        ));
        assert_eq!(monthly_due_target(2, &[10, 20], 19), 1);
        assert_eq!(monthly_due_target(2, &[10, 20], 20), 2);
    }

    #[test]
    fn future_start_does_not_generate_earlier_opportunities() {
        let mut item = aggregate(Schedule::Daily);
        item.habit.starts_on = NaiveDate::from_ymd_opt(2026, 8, 10).unwrap();

        assert!(!is_applicable(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 9).unwrap()
        ));
        assert!(is_applicable(
            &item,
            NaiveDate::from_ymd_opt(2026, 8, 10).unwrap()
        ));
    }

    #[test]
    fn custom_statistics_window_rejects_invalid_or_future_ranges() {
        let today = NaiveDate::from_ymd_opt(2026, 8, 15).unwrap();
        assert!(resolve_statistics_window(
            StatisticsPeriod::Custom,
            Some(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap()),
            Some(NaiveDate::from_ymd_opt(2026, 8, 5).unwrap()),
            today,
            None,
        )
        .is_err());
        assert!(resolve_statistics_window(
            StatisticsPeriod::Custom,
            Some(NaiveDate::from_ymd_opt(2026, 8, 16).unwrap()),
            Some(NaiveDate::from_ymd_opt(2026, 8, 20).unwrap()),
            today,
            None,
        )
        .is_err());
    }
}
