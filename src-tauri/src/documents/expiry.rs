//! Cálculo de caducidad usando días civiles de Madrid.

use std::time::SystemTime;

use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use chrono_tz::Europe::Madrid;

use super::document::CivilDate;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpiryStatus {
    NoExpiry,
    Expired,
    ExpiringSoon,
    Valid,
}

pub trait Clock {
    fn today(&self) -> CivilDate;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct MadridClock;

impl Clock for MadridClock {
    fn today(&self) -> CivilDate {
        let utc: DateTime<Utc> = SystemTime::now().into();
        let local = utc.with_timezone(&Madrid);
        CivilDate::new(local.year() as u16, local.month() as u8, local.day() as u8)
            .expect("chrono siempre produce una fecha civil válida")
    }
}

pub fn expiry_status(expires_on: Option<CivilDate>, today: CivilDate) -> ExpiryStatus {
    let Some(expires_on) = expires_on else {
        return ExpiryStatus::NoExpiry;
    };
    if expires_on < today {
        return ExpiryStatus::Expired;
    }

    let expiry = to_naive_date(expires_on);
    let threshold = to_naive_date(today) + Duration::days(30);
    if expiry <= threshold {
        ExpiryStatus::ExpiringSoon
    } else {
        ExpiryStatus::Valid
    }
}

fn to_naive_date(date: CivilDate) -> NaiveDate {
    NaiveDate::from_ymd_opt(date.year().into(), date.month().into(), date.day().into())
        .expect("CivilDate ya ha sido validada")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug)]
    struct FixedClock(CivilDate);
    impl Clock for FixedClock {
        fn today(&self) -> CivilDate {
            self.0
        }
    }

    fn date(year: u16, month: u8, day: u8) -> CivilDate {
        CivilDate::new(year, month, day).unwrap()
    }

    #[test]
    fn classifies_all_expiry_boundaries_with_a_fixed_clock() {
        let clock = FixedClock(date(2026, 8, 12));
        let today = clock.today();
        assert_eq!(expiry_status(None, today), ExpiryStatus::NoExpiry);
        assert_eq!(
            expiry_status(Some(date(2026, 8, 11)), today),
            ExpiryStatus::Expired
        );
        assert_eq!(
            expiry_status(Some(date(2026, 8, 12)), today),
            ExpiryStatus::ExpiringSoon
        );
        assert_eq!(
            expiry_status(Some(date(2026, 9, 11)), today),
            ExpiryStatus::ExpiringSoon
        );
        assert_eq!(
            expiry_status(Some(date(2026, 9, 12)), today),
            ExpiryStatus::Valid
        );
    }

    #[test]
    fn thirty_days_cross_month_and_year_boundaries() {
        let today = date(2026, 12, 20);
        assert_eq!(
            expiry_status(Some(date(2027, 1, 19)), today),
            ExpiryStatus::ExpiringSoon
        );
        assert_eq!(
            expiry_status(Some(date(2027, 1, 20)), today),
            ExpiryStatus::Valid
        );
    }
}
