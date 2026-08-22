//! Cálculos derivados y reglas de seguimiento del módulo.

use chrono::NaiveDate;

use super::model::{
    CanonStatus, ContentKind, MediaContent, MediaError, MediaKind, MediaTitle, TrackingStatus,
    WatchSession,
};

#[derive(Debug, Clone)]
pub struct MediaAggregate {
    pub title: MediaTitle,
    pub contents: Vec<MediaContent>,
    pub sessions: Vec<WatchSession>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MediaProgress {
    pub watched: u32,
    pub total: Option<u32>,
    pub total_incomplete: bool,
    pub percentage: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct MediaStatistics {
    pub active_titles: u32,
    pub anime_titles: u32,
    pub series_titles: u32,
    pub movie_titles: u32,
    pub watched_episodes: u32,
    pub completed_movies: u32,
    pub sessions: u32,
    pub average_score: Option<f64>,
    pub by_status: Vec<(TrackingStatus, u32)>,
    pub top_titles: Vec<(String, String, f64)>,
}

pub fn progress_for(aggregate: &MediaAggregate) -> MediaProgress {
    if aggregate.title.kind == MediaKind::Movie {
        let watched = aggregate.title.watched_units.min(1);
        return MediaProgress {
            watched,
            total: Some(1),
            total_incomplete: false,
            percentage: Some(f64::from(watched) * 100.0),
        };
    }

    let included: Vec<_> = aggregate
        .contents
        .iter()
        .filter(|content| content.canon_status != CanonStatus::Omitted)
        .collect();
    let watched = included
        .iter()
        .map(|content| content.watched_episodes)
        .sum();
    let total_incomplete = included
        .iter()
        .any(|content| content.effective_total().is_none());
    let known_total: u32 = included
        .iter()
        .filter_map(|content| content.effective_total())
        .sum();
    let total = (!total_incomplete || known_total > 0).then_some(known_total);
    let percentage = if total_incomplete {
        None
    } else {
        total.and_then(|value| {
            (value > 0).then_some((f64::from(watched) * 100.0 / f64::from(value)).min(100.0))
        })
    };
    MediaProgress {
        watched,
        total,
        total_incomplete,
        percentage,
    }
}

pub fn content_score_average(contents: &[MediaContent]) -> Option<f64> {
    let scores: Vec<_> = contents
        .iter()
        .filter(|content| content.canon_status != CanonStatus::Omitted)
        .filter_map(|content| content.score)
        .collect();
    (!scores.is_empty()).then(|| scores.iter().sum::<f64>() / scores.len() as f64)
}

pub fn effective_title_score(aggregate: &MediaAggregate) -> Option<f64> {
    aggregate
        .title
        .score
        .or_else(|| content_score_average(&aggregate.contents))
}

pub fn suggested_title_status(aggregate: &MediaAggregate) -> Option<TrackingStatus> {
    if aggregate.title.kind == MediaKind::Movie {
        let suggested = if aggregate.title.watched_units == 1 {
            TrackingStatus::Completed
        } else {
            TrackingStatus::Pending
        };
        return (suggested != aggregate.title.status).then_some(suggested);
    }

    let included: Vec<_> = aggregate
        .contents
        .iter()
        .filter(|content| content.canon_status != CanonStatus::Omitted)
        .collect();
    if included.is_empty() {
        return None;
    }
    let has_in_progress = included.iter().any(|content| {
        let incomplete = content
            .effective_total()
            .map_or(true, |total| content.watched_episodes < total);
        incomplete && (content.status == TrackingStatus::Watching || content.watched_episodes > 0)
    });
    let has_waiting = included
        .iter()
        .any(|content| content.status == TrackingStatus::WaitingContent);
    let completed_except_waiting = included.iter().all(|content| {
        content.status == TrackingStatus::WaitingContent
            || content
                .effective_total()
                .is_some_and(|total| content.watched_episodes >= total)
    });
    let all_completed = included.iter().all(|content| {
        content
            .effective_total()
            .is_some_and(|total| content.watched_episodes >= total)
    });
    let suggested = if has_in_progress {
        Some(TrackingStatus::Watching)
    } else if has_waiting && completed_except_waiting {
        Some(TrackingStatus::WaitingContent)
    } else if all_completed {
        Some(TrackingStatus::Completed)
    } else {
        None
    };
    suggested.filter(|status| *status != aggregate.title.status)
}

pub fn studios_for(aggregate: &MediaAggregate) -> Vec<String> {
    let mut studios = Vec::new();
    for studio in aggregate
        .contents
        .iter()
        .filter_map(|content| content.studio.as_ref())
    {
        if !studios
            .iter()
            .any(|stored: &String| stored.eq_ignore_ascii_case(studio))
        {
            studios.push(studio.clone());
        }
    }
    studios.sort_by_key(|studio| studio.to_lowercase());
    studios
}

pub fn validate_content_parent(
    title: &MediaTitle,
    content: &MediaContent,
) -> Result<(), MediaError> {
    if title.kind != MediaKind::Anime {
        return Err(MediaError::TitleCannotHaveContents);
    }
    if content.title_id != title.id {
        return Err(MediaError::InvalidId);
    }
    Ok(())
}

pub fn validate_progress_change(
    current: u32,
    next: u32,
    total: Option<u32>,
    date: NaiveDate,
    today: NaiveDate,
) -> Result<i32, MediaError> {
    if date > today {
        return Err(MediaError::FutureSession);
    }
    if total.is_some_and(|value| next > value) {
        return Err(MediaError::ProgressExceedsTotal);
    }
    Ok(next as i32 - current as i32)
}

pub fn next_content(aggregate: &MediaAggregate) -> Option<&MediaContent> {
    aggregate
        .contents
        .iter()
        .find(|content| can_increment_content(content))
}

pub fn can_increment_content(content: &MediaContent) -> bool {
    content.canon_status != CanonStatus::Omitted
        && !matches!(
            content.status,
            TrackingStatus::Dropped | TrackingStatus::WaitingContent
        )
        && content
            .effective_total()
            .map_or(true, |total| content.watched_episodes < total)
}

pub fn build_statistics(aggregates: &[MediaAggregate]) -> MediaStatistics {
    let active: Vec<_> = aggregates
        .iter()
        .filter(|aggregate| !aggregate.title.archived)
        .collect();
    let scores: Vec<_> = active
        .iter()
        .filter_map(|aggregate| effective_title_score(aggregate))
        .collect();
    let statuses = [
        TrackingStatus::Watching,
        TrackingStatus::Pending,
        TrackingStatus::Paused,
        TrackingStatus::Completed,
        TrackingStatus::Dropped,
        TrackingStatus::WaitingContent,
    ];
    let mut top_titles: Vec<_> = active
        .iter()
        .filter(|aggregate| aggregate.title.kind == MediaKind::Anime)
        .filter_map(|aggregate| {
            effective_title_score(aggregate).map(|score| {
                (
                    aggregate.title.id.as_str().to_owned(),
                    aggregate.title.name.clone(),
                    score,
                )
            })
        })
        .collect();
    top_titles.sort_by(|left, right| right.2.total_cmp(&left.2));

    MediaStatistics {
        active_titles: active.len() as u32,
        anime_titles: count_kind(&active, MediaKind::Anime),
        series_titles: count_kind(&active, MediaKind::Series),
        movie_titles: count_kind(&active, MediaKind::Movie),
        watched_episodes: active
            .iter()
            .filter(|aggregate| aggregate.title.kind != MediaKind::Movie)
            .flat_map(|aggregate| aggregate.contents.iter())
            .filter(|content| content.canon_status != CanonStatus::Omitted)
            .map(|content| content.watched_episodes)
            .sum(),
        completed_movies: active
            .iter()
            .filter(|aggregate| {
                aggregate.title.kind == MediaKind::Movie && aggregate.title.watched_units == 1
            })
            .count() as u32,
        sessions: active
            .iter()
            .map(|aggregate| aggregate.sessions.len() as u32)
            .sum(),
        average_score: (!scores.is_empty())
            .then(|| scores.iter().sum::<f64>() / scores.len() as f64),
        by_status: statuses
            .into_iter()
            .map(|status| {
                (
                    status,
                    active
                        .iter()
                        .filter(|aggregate| aggregate.title.status == status)
                        .count() as u32,
                )
            })
            .collect(),
        top_titles,
    }
}

fn count_kind(aggregates: &[&MediaAggregate], kind: MediaKind) -> u32 {
    aggregates
        .iter()
        .filter(|aggregate| aggregate.title.kind == kind)
        .count() as u32
}

pub fn default_total_for(kind: ContentKind, total: Option<u32>) -> Option<u32> {
    total.or_else(|| (kind != ContentKind::Season).then_some(1))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::media::model::{
        MediaContentDraft, MediaContentId, MediaTitleDraft, MediaTitleId, SessionSource,
    };

    fn title(kind: MediaKind) -> MediaTitle {
        MediaTitle::new(
            MediaTitleId::generate(),
            MediaTitleDraft {
                name: "Boku no Hero Academia".into(),
                alternative_title: None,
                genres: vec!["Acción".into()],
                kind,
                is_anime: kind == MediaKind::Anime,
                status: TrackingStatus::Watching,
                score: Some(8.0),
                opinion: None,
                favorite: false,
                started_on: None,
                finished_on: None,
                current_season: None,
                current_episode: None,
            },
        )
        .unwrap()
    }

    fn content(
        title_id: MediaTitleId,
        name: &str,
        total: Option<u32>,
        watched: u32,
        canon_status: CanonStatus,
    ) -> MediaContent {
        MediaContent::new(
            MediaContentId::generate(),
            title_id,
            MediaContentDraft {
                name: name.into(),
                kind: ContentKind::Season,
                status: TrackingStatus::Watching,
                canon_status,
                total_episodes: total,
                watched_episodes: watched,
                studio: None,
                score: None,
                opinion: None,
                notes: None,
                started_on: None,
                released_on: None,
                finished_on: None,
            },
            0,
        )
        .unwrap()
    }

    #[test]
    fn omitted_content_does_not_lower_progress() {
        let title = title(MediaKind::Anime);
        let included = content(
            title.id.clone(),
            "Temporada 1",
            Some(12),
            12,
            CanonStatus::Canon,
        );
        let omitted = content(title.id.clone(), "OVA", Some(1), 0, CanonStatus::Omitted);
        let progress = progress_for(&MediaAggregate {
            title,
            contents: vec![included, omitted],
            sessions: vec![],
        });
        assert_eq!(progress.watched, 12);
        assert_eq!(progress.total, Some(12));
        assert_eq!(progress.percentage, Some(100.0));
    }

    #[test]
    fn completed_content_can_increment_until_its_real_total() {
        let title = title(MediaKind::Anime);
        let mut completed = content(
            title.id.clone(),
            "Temporada importada",
            Some(13),
            0,
            CanonStatus::Canon,
        );
        completed.status = TrackingStatus::Completed;

        assert!(can_increment_content(&completed));
        let aggregate = MediaAggregate {
            title,
            contents: vec![completed],
            sessions: vec![],
        };
        assert_eq!(
            next_content(&aggregate).map(|content| content.name.as_str()),
            Some("Temporada importada")
        );

        let mut full = aggregate.contents[0].clone();
        full.watched_episodes = 13;
        assert!(!can_increment_content(&full));
    }

    #[test]
    fn unknown_total_remains_explicit() {
        let title = title(MediaKind::Anime);
        let progress = progress_for(&MediaAggregate {
            contents: vec![content(
                title.id.clone(),
                "Temporada nueva",
                None,
                3,
                CanonStatus::Canon,
            )],
            title,
            sessions: vec![],
        });
        assert_eq!(progress.watched, 3);
        assert_eq!(progress.total, None);
        assert!(progress.total_incomplete);
    }

    #[test]
    fn unknown_future_content_keeps_the_confirmed_total_visible() {
        let title = title(MediaKind::Anime);
        let confirmed = content(
            title.id.clone(),
            "Temporadas confirmadas",
            Some(150),
            130,
            CanonStatus::Canon,
        );
        let future = content(
            title.id.clone(),
            "Temporada futura",
            None,
            0,
            CanonStatus::Canon,
        );
        let progress = progress_for(&MediaAggregate {
            title,
            contents: vec![confirmed, future],
            sessions: vec![],
        });

        assert_eq!(progress.watched, 130);
        assert_eq!(progress.total, Some(150));
        assert!(progress.total_incomplete);
        assert_eq!(progress.percentage, None);
    }

    #[test]
    fn official_score_and_content_average_are_independent() {
        let title = title(MediaKind::Anime);
        let mut first = content(title.id.clone(), "T1", Some(12), 12, CanonStatus::Canon);
        first.score = Some(9.0);
        let mut second = content(title.id.clone(), "Película", Some(1), 1, CanonStatus::Canon);
        second.score = Some(5.0);
        assert_eq!(title.score, Some(8.0));
        assert_eq!(content_score_average(&[first, second]), Some(7.0));
    }

    #[test]
    fn anime_top_keeps_all_franchises_and_excludes_independent_movies() {
        let mut aggregates: Vec<_> = (0..6)
            .map(|index| {
                let mut franchise = title(MediaKind::Anime);
                franchise.name = format!("Anime {index}");
                franchise.score = Some(7.0 + f64::from(index) / 10.0);
                MediaAggregate {
                    title: franchise,
                    contents: vec![],
                    sessions: vec![],
                }
            })
            .collect();
        let mut movie = title(MediaKind::Movie);
        movie.name = "Película independiente".into();
        movie.is_anime = true;
        movie.score = Some(10.0);
        aggregates.push(MediaAggregate {
            title: movie,
            contents: vec![],
            sessions: vec![],
        });

        let statistics = build_statistics(&aggregates);

        assert_eq!(statistics.top_titles.len(), 6);
        assert!(statistics
            .top_titles
            .iter()
            .all(|(_, name, _)| name != "Película independiente"));
    }

    #[test]
    fn global_status_is_only_suggested_from_contents() {
        let mut title = title(MediaKind::Anime);
        title.status = TrackingStatus::Paused;
        let complete = content(title.id.clone(), "T1", Some(12), 12, CanonStatus::Canon);
        let aggregate = MediaAggregate {
            title,
            contents: vec![complete],
            sessions: vec![],
        };
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Completed)
        );
        assert_eq!(aggregate.title.status, TrackingStatus::Paused);
    }

    #[test]
    fn progress_rejects_future_and_overflow() {
        let today = NaiveDate::from_ymd_opt(2026, 8, 16).unwrap();
        assert_eq!(
            validate_progress_change(4, 13, Some(12), today, today).unwrap_err(),
            MediaError::ProgressExceedsTotal
        );
        assert_eq!(
            validate_progress_change(4, 5, None, today.succ_opt().unwrap(), today).unwrap_err(),
            MediaError::FutureSession
        );
    }

    #[test]
    fn session_model_supports_episode_entries() {
        let session = WatchSession {
            id: uuid::Uuid::new_v4().to_string(),
            title_id: None,
            content_id: Some(MediaContentId::generate()),
            watched_on: NaiveDate::from_ymd_opt(2026, 8, 16).unwrap(),
            delta: 1,
            episode_number: Some(2),
            source: SessionSource::ManualAdjustment,
        };
        assert_eq!(session.episode_number, Some(2));
    }
}
