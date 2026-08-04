//! Tipos de dominio para instancias planificadas en una semana.

use super::meal::{calculate_macros, MacroTotals, MealDomainError, MealId, MealIngredient};

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct PlannedInstanceId(String);

impl PlannedInstanceId {
    pub fn new(value: impl Into<String>) -> Result<Self, MealDomainError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(MealDomainError::EmptyMealId);
        }
        Ok(Self(value))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MealSlot {
    Breakfast,
    Lunch,
    Snack,
    Dinner,
    Extra,
}

impl MealSlot {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Breakfast => "breakfast",
            Self::Lunch => "lunch",
            Self::Snack => "snack",
            Self::Dinner => "dinner",
            Self::Extra => "extra",
        }
    }
    pub fn from_database(value: &str) -> Result<Self, MealDomainError> {
        match value {
            "breakfast" => Ok(Self::Breakfast),
            "lunch" => Ok(Self::Lunch),
            "snack" => Ok(Self::Snack),
            "dinner" => Ok(Self::Dinner),
            "extra" => Ok(Self::Extra),
            _ => Err(MealDomainError::InvalidPosition),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct WeekStart(String);

impl WeekStart {
    pub fn new(value: impl Into<String>) -> Result<Self, MealDomainError> {
        let value = value.into();
        let bytes = value.as_bytes();
        if bytes.len() != 10
            || bytes[4] != b'-'
            || bytes[7] != b'-'
            || !bytes
                .iter()
                .enumerate()
                .filter(|(index, _)| *index != 4 && *index != 7)
                .all(|(_, byte)| byte.is_ascii_digit())
        {
            return Err(MealDomainError::InvalidWeekStart);
        }
        let year = value[0..4]
            .parse::<i32>()
            .map_err(|_| MealDomainError::InvalidWeekStart)?;
        let month = value[5..7]
            .parse::<u32>()
            .map_err(|_| MealDomainError::InvalidWeekStart)?;
        let day = value[8..10]
            .parse::<u32>()
            .map_err(|_| MealDomainError::InvalidWeekStart)?;
        if year < 1900
            || !(1..=12).contains(&month)
            || day == 0
            || day > days_in_month(year, month)
            || weekday(year, month, day) != 1
        {
            return Err(MealDomainError::InvalidWeekStart);
        }
        Ok(Self(value))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        2 => 28,
        _ => 0,
    }
}

// Sakamoto: 0 es domingo y 1 es lunes.
fn weekday(mut year: i32, month: u32, day: u32) -> u32 {
    const OFFSETS: [i32; 12] = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    if month < 3 {
        year -= 1;
    }
    (year + year / 4 - year / 100 + year / 400 + OFFSETS[(month - 1) as usize] + day as i32)
        .rem_euclid(7) as u32
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlannedInstance {
    id: PlannedInstanceId,
    week_start: WeekStart,
    weekday: u8,
    slot: MealSlot,
    position: u32,
    source_meal_id: Option<MealId>,
    is_modified: bool,
    ingredients: Vec<MealIngredient>,
}

impl PlannedInstance {
    pub fn new(
        id: PlannedInstanceId,
        week_start: WeekStart,
        weekday: u8,
        slot: MealSlot,
        position: u32,
        source_meal_id: Option<MealId>,
        ingredients: Vec<MealIngredient>,
    ) -> Result<Self, MealDomainError> {
        Self::from_persisted(
            id,
            week_start,
            weekday,
            slot,
            position,
            source_meal_id,
            false,
            ingredients,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn from_persisted(
        id: PlannedInstanceId,
        week_start: WeekStart,
        weekday: u8,
        slot: MealSlot,
        position: u32,
        source_meal_id: Option<MealId>,
        is_modified: bool,
        mut ingredients: Vec<MealIngredient>,
    ) -> Result<Self, MealDomainError> {
        if weekday > 6 {
            return Err(MealDomainError::InvalidWeekday);
        }
        if ingredients.is_empty() {
            return Err(MealDomainError::MealRequiresIngredients);
        }
        ingredients.sort_by_key(MealIngredient::position);
        Ok(Self {
            id,
            week_start,
            weekday,
            slot,
            position,
            source_meal_id,
            is_modified,
            ingredients,
        })
    }

    pub fn id(&self) -> &PlannedInstanceId {
        &self.id
    }
    pub fn week_start(&self) -> &WeekStart {
        &self.week_start
    }
    pub fn weekday(&self) -> u8 {
        self.weekday
    }
    pub fn slot(&self) -> MealSlot {
        self.slot
    }
    pub fn position(&self) -> u32 {
        self.position
    }
    pub fn source_meal_id(&self) -> Option<&MealId> {
        self.source_meal_id.as_ref()
    }
    pub fn is_modified(&self) -> bool {
        self.is_modified
    }
    pub fn ingredients(&self) -> &[MealIngredient] {
        &self.ingredients
    }

    pub fn macros(
        &self,
        products: &[super::product::Product],
    ) -> Result<MacroTotals, MealDomainError> {
        calculate_macros(&self.ingredients, products)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_mondays_and_rejects_other_dates() {
        assert!(WeekStart::new("2026-08-03").is_ok());
        assert_eq!(
            WeekStart::new("2026-8-3"),
            Err(MealDomainError::InvalidWeekStart)
        );
        assert_eq!(
            WeekStart::new("2026-08-01"),
            Err(MealDomainError::InvalidWeekStart)
        );
    }
}
