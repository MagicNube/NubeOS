//! Entidades y reglas básicas del módulo Hábitos.

use std::{collections::BTreeSet, fmt};

use chrono::NaiveDate;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct HabitId(String);

impl HabitId {
    pub fn new(value: impl Into<String>) -> Result<Self, HabitError> {
        let value = value.into();
        Uuid::parse_str(&value).map_err(|_| HabitError::InvalidId)?;
        Ok(Self(value))
    }

    pub fn generate() -> Self {
        Self(Uuid::new_v4().to_string())
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HabitKind {
    Habit,
    Routine,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HabitCategory {
    Health,
    Sport,
    Learning,
    PersonalCare,
    Home,
    Organization,
    Leisure,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HabitIcon {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HabitStatus {
    Active,
    Paused,
    Archived,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HabitLogState {
    Completed,
    Skipped,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Schedule {
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

impl Schedule {
    pub fn validate(self) -> Result<Self, HabitError> {
        match &self {
            Self::Daily => {}
            Self::SpecificWeekdays { weekdays } => validate_weekdays(weekdays, true)?,
            Self::WeeklyTarget {
                target,
                preferred_weekdays,
            } => {
                if !(1..=7).contains(target) {
                    return Err(HabitError::InvalidWeeklyTarget);
                }
                validate_weekdays(preferred_weekdays, false)?;
            }
            Self::MonthlyTarget {
                target,
                preferred_days,
            } => {
                if !(1..=31).contains(target) {
                    return Err(HabitError::InvalidMonthlyTarget);
                }
                if preferred_days.iter().any(|day| !(1..=28).contains(day)) {
                    return Err(HabitError::InvalidMonthlyDay);
                }
                if preferred_days
                    .iter()
                    .copied()
                    .collect::<BTreeSet<_>>()
                    .len()
                    != preferred_days.len()
                {
                    return Err(HabitError::DuplicateMonthlyDay);
                }
                if preferred_days.len() > usize::from(*target) {
                    return Err(HabitError::TooManyMonthlyDays);
                }
            }
        }
        Ok(self)
    }
}

fn validate_weekdays(weekdays: &[u8], required: bool) -> Result<(), HabitError> {
    if required && weekdays.is_empty() {
        return Err(HabitError::MissingWeekdays);
    }
    if weekdays.iter().any(|day| !(1..=7).contains(day)) {
        return Err(HabitError::InvalidWeekday);
    }
    if weekdays.iter().copied().collect::<BTreeSet<_>>().len() != weekdays.len() {
        return Err(HabitError::DuplicateWeekday);
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct Habit {
    pub id: HabitId,
    pub name: String,
    pub kind: HabitKind,
    pub category: HabitCategory,
    pub icon: HabitIcon,
    pub status: HabitStatus,
    pub position: u32,
    pub created_on: NaiveDate,
    pub starts_on: NaiveDate,
    pub schedule: Schedule,
}

impl Habit {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: HabitId,
        name: String,
        kind: HabitKind,
        category: HabitCategory,
        icon: HabitIcon,
        status: HabitStatus,
        position: u32,
        created_on: NaiveDate,
        starts_on: NaiveDate,
        schedule: Schedule,
    ) -> Result<Self, HabitError> {
        let name = name.trim().to_owned();
        if name.is_empty() {
            return Err(HabitError::EmptyName);
        }
        if name.chars().count() > 100 {
            return Err(HabitError::NameTooLong);
        }
        if starts_on < created_on {
            return Err(HabitError::StartBeforeCreation);
        }
        Ok(Self {
            id,
            name,
            kind,
            category,
            icon,
            status,
            position,
            created_on,
            starts_on,
            schedule: schedule.validate()?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ScheduleRevision {
    pub effective_from: NaiveDate,
    pub schedule: Schedule,
}

#[derive(Debug, Clone)]
pub struct PauseInterval {
    pub starts_on: NaiveDate,
    pub ends_on: Option<NaiveDate>,
}

impl PauseInterval {
    pub fn contains(&self, date: NaiveDate) -> bool {
        self.starts_on <= date && self.ends_on.map_or(true, |end| date < end)
    }
}

#[derive(Debug, Clone)]
pub struct HabitAggregate {
    pub habit: Habit,
    pub revisions: Vec<ScheduleRevision>,
    pub pauses: Vec<PauseInterval>,
    pub logs: std::collections::BTreeMap<NaiveDate, HabitLogState>,
}

impl HabitAggregate {
    pub fn schedule_at(&self, date: NaiveDate) -> Option<&Schedule> {
        self.revisions
            .iter()
            .rev()
            .find(|revision| revision.effective_from <= date)
            .map(|revision| &revision.schedule)
    }

    pub fn is_paused_on(&self, date: NaiveDate) -> bool {
        self.pauses.iter().any(|interval| interval.contains(date))
    }
}

#[derive(Debug)]
pub enum HabitError {
    InvalidId,
    EmptyName,
    NameTooLong,
    MissingWeekdays,
    InvalidWeekday,
    DuplicateWeekday,
    InvalidWeeklyTarget,
    InvalidMonthlyTarget,
    InvalidMonthlyDay,
    DuplicateMonthlyDay,
    TooManyMonthlyDays,
    StartBeforeCreation,
}

impl fmt::Display for HabitError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidId => "El identificador del hábito no es válido.",
            Self::EmptyName => "El nombre no puede estar vacío.",
            Self::NameTooLong => "El nombre no puede superar 100 caracteres.",
            Self::MissingWeekdays => "Selecciona al menos un día de la semana.",
            Self::InvalidWeekday => "Los días deben estar entre lunes y domingo.",
            Self::DuplicateWeekday => "No se puede repetir un día de la semana.",
            Self::InvalidWeeklyTarget => "El objetivo semanal debe estar entre 1 y 7.",
            Self::InvalidMonthlyTarget => "El objetivo mensual debe estar entre 1 y 31.",
            Self::InvalidMonthlyDay => "Los días orientativos deben estar entre 1 y 28.",
            Self::DuplicateMonthlyDay => "No se puede repetir un día orientativo.",
            Self::TooManyMonthlyDays => {
                "No puede haber más días orientativos que realizaciones mensuales."
            }
            Self::StartBeforeCreation => "La fecha de inicio no puede ser anterior a la creación.",
        })
    }
}

impl std::error::Error for HabitError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schedules_reject_invalid_targets_and_duplicate_days() {
        assert!(Schedule::WeeklyTarget {
            target: 0,
            preferred_weekdays: vec![]
        }
        .validate()
        .is_err());
        assert!(Schedule::SpecificWeekdays {
            weekdays: vec![1, 1]
        }
        .validate()
        .is_err());
        assert!(Schedule::MonthlyTarget {
            target: 1,
            preferred_days: vec![29]
        }
        .validate()
        .is_err());
        assert!(Schedule::MonthlyTarget {
            target: 1,
            preferred_days: vec![1, 15]
        }
        .validate()
        .is_err());
        assert!(Schedule::WeeklyTarget {
            target: 4,
            preferred_weekdays: vec![1, 3, 5, 6]
        }
        .validate()
        .is_ok());
    }

    #[test]
    fn pause_end_is_exclusive() {
        let interval = PauseInterval {
            starts_on: NaiveDate::from_ymd_opt(2026, 8, 10).unwrap(),
            ends_on: Some(NaiveDate::from_ymd_opt(2026, 8, 12).unwrap()),
        };
        assert!(interval.contains(NaiveDate::from_ymd_opt(2026, 8, 11).unwrap()));
        assert!(!interval.contains(NaiveDate::from_ymd_opt(2026, 8, 12).unwrap()));
    }
}
