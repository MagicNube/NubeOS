//! Cálculos derivados y reglas de seguimiento del módulo.

use chrono::NaiveDate;
use std::collections::{HashMap, HashSet};

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

#[derive(Debug, Clone)]
pub struct ContentRunSummary {
    pub id: String,
    pub content_id: String,
    pub ordinal: usize,
    pub status: String,
    pub is_progress_run: bool,
    pub first_on: NaiveDate,
    pub last_on: NaiveDate,
    pub watched: usize,
    pub next_episode: Option<u32>,
    pub can_complete: bool,
}

pub fn content_run_summaries(aggregate: &MediaAggregate) -> Vec<ContentRunSummary> {
    let mut grouped: HashMap<&str, Vec<&WatchSession>> = HashMap::new();
    for session in &aggregate.sessions {
        if let Some(run_id) = session.run_id.as_deref() {
            grouped.entry(run_id).or_default().push(session);
        }
    }
    let mut runs = Vec::new();
    for (id, sessions) in grouped {
        let first = sessions[0];
        let Some(content) = aggregate
            .contents
            .iter()
            .find(|c| Some(&c.id) == first.content_id.as_ref())
        else {
            continue;
        };
        let episodes: HashSet<u32> = sessions.iter().filter_map(|s| s.episode_number).collect();
        let mut next = 1_u32;
        while episodes.contains(&next) {
            let Some(value) = next.checked_add(1) else {
                break;
            };
            next = value;
        }
        let total = content.effective_total();
        let complete = total.is_some_and(|n| next > n);
        let is_progress_run = sessions.iter().all(|s| !s.is_rewatch);
        // The legacy progress run is completed by the existing progress controls.
        let status = if complete && is_progress_run && first.run_status == "inProgress" {
            "completed"
        } else if is_progress_run && !complete && total.is_some() && first.run_status == "completed"
        {
            "inProgress"
        } else {
            &first.run_status
        };
        runs.push(ContentRunSummary {
            id: id.to_owned(),
            content_id: content.id.as_str().to_owned(),
            ordinal: 0,
            status: status.to_owned(),
            is_progress_run,
            first_on: sessions.iter().map(|s| s.watched_on).min().unwrap(),
            last_on: sessions.iter().map(|s| s.watched_on).max().unwrap(),
            watched: episodes.len(),
            next_episode: (!complete).then_some(next),
            can_complete: complete || (total.is_none() && !episodes.is_empty()),
        });
    }
    runs.sort_by(|a, b| {
        a.content_id
            .cmp(&b.content_id)
            .then(a.first_on.cmp(&b.first_on))
            .then(b.is_progress_run.cmp(&a.is_progress_run))
            .then(a.id.cmp(&b.id))
    });
    let mut ordinals = HashMap::<String, usize>::new();
    for run in &mut runs {
        let ordinal = ordinals.entry(run.content_id.clone()).or_default();
        run.ordinal = *ordinal;
        *ordinal += 1;
    }
    runs
}

/// Visible chronology is independent of the bookkeeping flag used to protect progress.
pub fn chronological_rewatch_sessions(sessions: &[WatchSession]) -> HashSet<String> {
    let mut ordered: Vec<_> = sessions
        .iter()
        .filter(|session| session.content_id.is_some() && session.episode_number.is_some())
        .collect();
    ordered.sort_by(|a, b| {
        a.watched_on
            .cmp(&b.watched_on)
            .then_with(|| a.is_rewatch.cmp(&b.is_rewatch))
            .then_with(|| a.registration_id.cmp(&b.registration_id))
            .then_with(|| a.id.cmp(&b.id))
    });
    let mut first_registration: HashMap<(&str, u32), &str> = HashMap::new();
    let mut repeated = HashSet::new();
    for session in ordered {
        if let (Some(content), Some(episode)) = (&session.content_id, session.episode_number) {
            let first = first_registration
                .entry((content.as_str(), episode))
                .or_insert(session.registration_id.as_str());
            if *first != session.registration_id {
                repeated.insert(session.id.clone());
            }
        }
    }
    repeated
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MediaProgress {
    pub watched: u32,
    pub total: Option<u32>,
    pub total_incomplete: bool,
    pub percentage: Option<f64>,
    pub known_percentage: Option<f64>,
    pub upcoming_count: usize,
    pub available_completed: bool,
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
            known_percentage: Some(f64::from(watched) * 100.0),
            upcoming_count: 0,
            available_completed: watched == 1,
        };
    }

    let included: Vec<_> = aggregate
        .contents
        .iter()
        .filter(|content| {
            content.canon_status != CanonStatus::Omitted
                && content.status != TrackingStatus::WaitingContent
        })
        .collect();
    let upcoming_count = aggregate
        .contents
        .iter()
        .filter(|content| {
            content.canon_status != CanonStatus::Omitted
                && content.status == TrackingStatus::WaitingContent
        })
        .count();
    let available_completed = !included.is_empty()
        && included.iter().all(|content| {
            content
                .effective_total()
                .is_some_and(|total| content.watched_episodes >= total)
        });
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
    let known_watched: u32 = included
        .iter()
        .filter(|content| content.effective_total().is_some())
        .map(|content| content.watched_episodes)
        .sum();
    let known_percentage = (known_total > 0)
        .then(|| (f64::from(known_watched) * 100.0 / f64::from(known_total)).min(100.0));
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
        known_percentage,
        upcoming_count,
        available_completed,
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
    // Use recommended order, not edit timestamps or incidental query ordering.
    // Pending/upcoming content is not a decision to stop an existing viewing.
    let last_marked = included
        .iter()
        .filter(|content| {
            !matches!(
                content.status,
                TrackingStatus::Pending | TrackingStatus::WaitingContent
            )
        })
        .max_by(|a, b| {
            a.position
                .cmp(&b.position)
                .then(a.id.as_str().cmp(b.id.as_str()))
        });
    let explicit_stop = last_marked.and_then(|content| match content.status {
        TrackingStatus::Dropped | TrackingStatus::Paused => Some(content.status),
        _ => None,
    });
    let has_in_progress = included.iter().any(|content| {
        let incomplete = content
            .effective_total()
            .map_or(true, |total| content.watched_episodes < total);
        !matches!(
            content.status,
            TrackingStatus::WaitingContent | TrackingStatus::Dropped | TrackingStatus::Paused
        ) && incomplete
            && (content.status == TrackingStatus::Watching || content.watched_episodes > 0)
    });
    let progress = progress_for(aggregate);
    let suggested = if explicit_stop.is_some() {
        explicit_stop
    } else if has_in_progress {
        Some(TrackingStatus::Watching)
    } else if included
        .iter()
        .all(|content| content.status == TrackingStatus::WaitingContent)
        || (progress.upcoming_count > 0 && progress.available_completed)
    {
        Some(TrackingStatus::WaitingContent)
    } else if progress.available_completed {
        Some(TrackingStatus::Completed)
    } else if progress.watched == 0
        && included.iter().all(|content| {
            matches!(
                content.status,
                TrackingStatus::Pending | TrackingStatus::WaitingContent
            )
        })
    {
        Some(TrackingStatus::Pending)
    } else if aggregate.title.kind == MediaKind::Anime
        && aggregate.title.status == TrackingStatus::Pending
        && progress.watched > 0
    {
        Some(TrackingStatus::Watching)
    } else if aggregate.title.kind == MediaKind::Anime
        && aggregate.title.status == TrackingStatus::WaitingContent
        && included.iter().any(|content| {
            content.status == TrackingStatus::Pending && content.watched_episodes == 0
        })
    {
        Some(TrackingStatus::ToResume)
    } else {
        None
    };
    suggested.filter(|status| *status != aggregate.title.status)
}

pub fn suggested_content_status(content: &MediaContent) -> Option<TrackingStatus> {
    if content.canon_status == CanonStatus::Omitted
        || content.status == TrackingStatus::WaitingContent
        || content.watched_episodes == 0
    {
        return None;
    }
    let suggested = if content
        .effective_total()
        .is_some_and(|total| content.watched_episodes >= total)
    {
        TrackingStatus::Completed
    } else {
        TrackingStatus::Watching
    };
    (suggested != content.status).then_some(suggested)
}

pub fn can_rewatch_content(content: &MediaContent) -> bool {
    content.canon_status != CanonStatus::Omitted
        && content.status != TrackingStatus::WaitingContent
        && content.watched_episodes > 0
        && content
            .effective_total()
            .map_or(content.status == TrackingStatus::Completed, |total| {
                content.watched_episodes >= total
            })
}

pub fn studios_for(aggregate: &MediaAggregate) -> Vec<String> {
    let mut studios = Vec::new();
    if let Some(studio) = aggregate.title.primary_studio.as_ref() {
        studios.push(studio.clone());
    }
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
    released_on: Option<NaiveDate>,
) -> Result<i32, MediaError> {
    if date > today {
        return Err(MediaError::FutureSession);
    }
    if released_on.is_some_and(|release| date < release) {
        return Err(MediaError::SessionBeforeRelease);
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
        TrackingStatus::ToResume,
    ];
    let mut top_titles: Vec<_> = active
        .iter()
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
                primary_studio: None,
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
    fn content_progress_suggests_status_without_overwriting_manual_choice() {
        let mut item = content(
            MediaTitleId::generate(),
            "Temporada 1",
            Some(12),
            3,
            CanonStatus::Canon,
        );
        for status in [
            TrackingStatus::Pending,
            TrackingStatus::Paused,
            TrackingStatus::Dropped,
            TrackingStatus::Completed,
        ] {
            item.status = status;
            assert_eq!(
                suggested_content_status(&item),
                Some(TrackingStatus::Watching)
            );
            assert_eq!(item.status, status);
        }
        item.status = TrackingStatus::Watching;
        assert_eq!(suggested_content_status(&item), None);
        item.watched_episodes = 12;
        assert_eq!(
            suggested_content_status(&item),
            Some(TrackingStatus::Completed)
        );
        item.status = TrackingStatus::Completed;
        assert_eq!(suggested_content_status(&item), None);
        item.watched_episodes = 0;
        assert_eq!(suggested_content_status(&item), None);
        item.watched_episodes = 3;
        item.total_episodes = None;
        assert_eq!(
            suggested_content_status(&item),
            Some(TrackingStatus::Watching)
        );
        item.canon_status = CanonStatus::Omitted;
        assert_eq!(suggested_content_status(&item), None);
        item.canon_status = CanonStatus::Canon;
        item.status = TrackingStatus::WaitingContent;
        assert_eq!(suggested_content_status(&item), None);
    }

    #[test]
    fn newly_available_content_suggests_resuming_without_changing_state() {
        let mut title = title(MediaKind::Anime);
        title.status = TrackingStatus::WaitingContent;
        let first = content(title.id.clone(), "T1", Some(12), 12, CanonStatus::Canon);
        let mut future = content(title.id.clone(), "T2", Some(12), 0, CanonStatus::Canon);
        future.status = TrackingStatus::WaitingContent;
        let mut aggregate = MediaAggregate {
            title,
            contents: vec![first, future],
            sessions: vec![],
        };
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[1].status = TrackingStatus::Pending;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::ToResume)
        );
        assert_eq!(aggregate.title.status, TrackingStatus::WaitingContent);
        for manual_status in [
            TrackingStatus::Paused,
            TrackingStatus::Dropped,
            TrackingStatus::ToResume,
        ] {
            aggregate.title.status = manual_status;
            assert_eq!(suggested_title_status(&aggregate), None);
        }
        aggregate.title.status = TrackingStatus::Pending;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.title.status = TrackingStatus::WaitingContent;
        aggregate.contents[1].watched_episodes = 1;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.contents[1].canon_status = CanonStatus::Omitted;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Completed)
        );
    }

    #[test]
    fn pending_anime_with_completed_season_still_suggests_watching() {
        let mut anime = title(MediaKind::Anime);
        anime.status = TrackingStatus::Pending;
        let mut first = content(anime.id.clone(), "T1", Some(12), 12, CanonStatus::Canon);
        first.status = TrackingStatus::Completed;
        let mut second = content(anime.id.clone(), "T2", Some(12), 0, CanonStatus::Canon);
        second.status = TrackingStatus::Pending;
        let mut aggregate = MediaAggregate {
            title: anime,
            contents: vec![first, second],
            sessions: vec![],
        };
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        assert_eq!(aggregate.title.status, TrackingStatus::Pending);
        for status in [
            TrackingStatus::Paused,
            TrackingStatus::Dropped,
            TrackingStatus::Completed,
            TrackingStatus::ToResume,
        ] {
            aggregate.title.status = status;
            assert_eq!(suggested_title_status(&aggregate), None);
        }
        aggregate.title.status = TrackingStatus::Pending;
        aggregate.contents[1].status = TrackingStatus::WaitingContent;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::WaitingContent)
        );
        aggregate.contents[1].status = TrackingStatus::Completed;
        aggregate.contents[1].watched_episodes = 12;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Completed)
        );
    }

    #[test]
    fn pending_anime_ignores_excluded_progress_and_does_not_invent_activity() {
        let mut anime = title(MediaKind::Anime);
        anime.status = TrackingStatus::Pending;
        let mut first = content(anime.id.clone(), "T1", Some(12), 12, CanonStatus::Omitted);
        first.status = TrackingStatus::Completed;
        let mut second = content(anime.id.clone(), "T2", None, 0, CanonStatus::Canon);
        second.status = TrackingStatus::Pending;
        let mut aggregate = MediaAggregate {
            title: anime,
            contents: vec![first, second],
            sessions: vec![],
        };
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[0].canon_status = CanonStatus::Canon;
        aggregate.contents[0].status = TrackingStatus::WaitingContent;
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[1].watched_episodes = 1;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        assert_eq!(aggregate.contents[1].status, TrackingStatus::Pending);
    }

    #[test]
    fn to_resume_is_only_a_title_status_for_anime() {
        let mut anime = title(MediaKind::Anime);
        anime.change_status(TrackingStatus::ToResume).unwrap();
        for kind in [MediaKind::Movie, MediaKind::Series] {
            let mut other = title(kind);
            let previous = other.status;
            assert_eq!(
                other.change_status(TrackingStatus::ToResume),
                Err(MediaError::InvalidTrackingStatus)
            );
            assert_eq!(other.status, previous);
        }
    }

    #[test]
    fn unreleased_contents_do_not_block_available_completion() {
        let mut title = title(MediaKind::Anime);
        title.status = TrackingStatus::Paused;
        let first = content(title.id.clone(), "T1", Some(12), 12, CanonStatus::Canon);
        let second = content(title.id.clone(), "T2", Some(12), 12, CanonStatus::Canon);
        let mut future = content(title.id.clone(), "T3", None, 0, CanonStatus::Canon);
        future.status = TrackingStatus::WaitingContent;
        let mut aggregate = MediaAggregate {
            title,
            contents: vec![first, second, future],
            sessions: vec![],
        };
        for total in [None, Some(24)] {
            aggregate.contents[2].total_episodes = total;
            let progress = progress_for(&aggregate);
            assert_eq!(progress.watched, 24);
            assert_eq!(progress.total, Some(24));
            assert_eq!(progress.percentage, Some(100.0));
            assert!(!progress.total_incomplete);
            assert!(progress.available_completed);
            assert_eq!(progress.upcoming_count, 1);
            assert_eq!(
                suggested_title_status(&aggregate),
                Some(TrackingStatus::WaitingContent)
            );
            assert_eq!(aggregate.title.status, TrackingStatus::Paused);
        }
        // Explicit availability, not a missing release date, determines inclusion.
        aggregate.contents[2].status = TrackingStatus::Pending;
        assert_eq!(progress_for(&aggregate).total, Some(48));
        assert!(!progress_for(&aggregate).available_completed);
        assert_eq!(progress_for(&aggregate).upcoming_count, 0);
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[2].total_episodes = None;
        assert!(progress_for(&aggregate).total_incomplete);
        aggregate.contents[2].status = TrackingStatus::WaitingContent;
        aggregate.contents[1].watched_episodes = 3;
        assert!(!progress_for(&aggregate).available_completed);
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.contents[1].watched_episodes = 12;
        aggregate.contents[2].canon_status = CanonStatus::Omitted;
        assert_eq!(progress_for(&aggregate).upcoming_count, 0);
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Completed)
        );
    }

    #[test]
    fn only_unreleased_or_empty_contents_are_not_completed() {
        let title = title(MediaKind::Anime);
        let mut future = content(title.id.clone(), "Futura", Some(12), 3, CanonStatus::Canon);
        future.status = TrackingStatus::WaitingContent;
        let mut aggregate = MediaAggregate {
            title,
            contents: vec![future],
            sessions: vec![],
        };
        let progress = progress_for(&aggregate);
        assert_eq!(progress.watched, 0);
        assert_eq!(progress.total, Some(0));
        assert!(!progress.available_completed);
        assert_eq!(progress.percentage, None);
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::WaitingContent)
        );
        assert_eq!(aggregate.contents[0].watched_episodes, 3); // Historical data is preserved.
        assert!(next_content(&aggregate).is_none());
        aggregate.contents.clear();
        assert!(!progress_for(&aggregate).available_completed);
        assert_eq!(suggested_title_status(&aggregate), None);
    }

    #[test]
    fn content_states_drive_suggestions_in_recommended_order() {
        let anime = title(MediaKind::Anime);
        let mut aggregate = MediaAggregate {
            title: anime,
            contents: vec![],
            sessions: vec![],
        };
        for (index, status) in [
            TrackingStatus::Completed,
            TrackingStatus::Dropped,
            TrackingStatus::Pending,
            TrackingStatus::WaitingContent,
        ]
        .into_iter()
        .enumerate()
        {
            let mut entry = content(
                aggregate.title.id.clone(),
                "Contenido",
                Some(12),
                if index == 0 { 12 } else { 0 },
                CanonStatus::Canon,
            );
            entry.position = index as u32;
            entry.status = status;
            aggregate.contents.push(entry);
        }
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Dropped)
        );
        aggregate.contents[1].watched_episodes = 3;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Dropped)
        );
        aggregate.contents[1].status = TrackingStatus::Paused;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Paused)
        );
        // Incidental array/query order cannot change the last marked content.
        aggregate.contents.reverse();
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Paused)
        );
        aggregate.contents[2].status = TrackingStatus::Watching;
        aggregate.title.status = TrackingStatus::Dropped;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.contents[2].canon_status = CanonStatus::Omitted;
        assert_eq!(suggested_title_status(&aggregate), None);
        // A later explicit Watching wins over an earlier abandonment.
        aggregate.contents[2].canon_status = CanonStatus::Canon;
        aggregate.contents[2].status = TrackingStatus::Dropped;
        aggregate.contents[1].status = TrackingStatus::Watching;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.title.status = TrackingStatus::Watching;
        assert_eq!(suggested_title_status(&aggregate), None);
    }

    #[test]
    fn pending_and_future_suggestions_do_not_invent_progress() {
        let anime = title(MediaKind::Anime);
        let mut entry = content(anime.id.clone(), "T1", Some(12), 0, CanonStatus::Canon);
        entry.status = TrackingStatus::Pending;
        let mut aggregate = MediaAggregate {
            title: anime,
            contents: vec![entry],
            sessions: vec![],
        };
        for status in [
            TrackingStatus::Completed,
            TrackingStatus::Dropped,
            TrackingStatus::Watching,
            TrackingStatus::WaitingContent,
        ] {
            aggregate.title.status = status;
            assert_eq!(
                suggested_title_status(&aggregate),
                Some(TrackingStatus::Pending)
            );
            assert_eq!(aggregate.title.status, status);
        }
        aggregate.title.status = TrackingStatus::Pending;
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[0].watched_episodes = 3;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::Watching)
        );
        aggregate.contents[0].watched_episodes = 0;
        aggregate.contents[0].status = TrackingStatus::WaitingContent;
        assert_eq!(
            suggested_title_status(&aggregate),
            Some(TrackingStatus::WaitingContent)
        );
        aggregate.title.status = TrackingStatus::WaitingContent;
        assert_eq!(suggested_title_status(&aggregate), None);
        aggregate.contents[0].canon_status = CanonStatus::Omitted;
        aggregate.title.status = TrackingStatus::Completed;
        assert_eq!(suggested_title_status(&aggregate), None);
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
    fn rewatch_uses_registered_progress_not_only_manual_status() {
        let mut item = content(
            MediaTitleId::generate(),
            "Solo Leveling T2",
            Some(13),
            0,
            CanonStatus::Canon,
        );
        item.status = TrackingStatus::Completed;
        for watched in [0, 3, 12] {
            item.watched_episodes = watched;
            assert!(!can_rewatch_content(&item));
            assert!(can_increment_content(&item));
        }
        item.watched_episodes = 13;
        assert!(can_rewatch_content(&item));
        assert!(!can_increment_content(&item));
        item.status = TrackingStatus::Paused;
        assert!(can_rewatch_content(&item));
        item.total_episodes = None;
        assert!(!can_rewatch_content(&item));
        item.status = TrackingStatus::Completed;
        assert!(can_rewatch_content(&item));
        item.watched_episodes = 0;
        assert!(!can_rewatch_content(&item));
        item.watched_episodes = 13;
        item.status = TrackingStatus::WaitingContent;
        assert!(!can_rewatch_content(&item));
        item.status = TrackingStatus::Completed;
        item.canon_status = CanonStatus::Omitted;
        assert!(!can_rewatch_content(&item));
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
    fn known_percentage_excludes_unknown_omitted_and_upcoming_contents() {
        let title = title(MediaKind::Anime);
        let known = content(
            title.id.clone(),
            "Conocido",
            Some(100),
            50,
            CanonStatus::Canon,
        );
        let unknown = content(
            title.id.clone(),
            "Desconocido",
            None,
            80,
            CanonStatus::Canon,
        );
        let omitted = content(
            title.id.clone(),
            "Omitido",
            Some(100),
            0,
            CanonStatus::Omitted,
        );
        let mut upcoming = content(title.id.clone(), "Futuro", Some(100), 0, CanonStatus::Canon);
        upcoming.status = TrackingStatus::WaitingContent;
        let progress = progress_for(&MediaAggregate {
            title,
            contents: vec![known, unknown, omitted, upcoming],
            sessions: vec![],
        });
        assert_eq!(progress.watched, 130);
        assert_eq!(progress.total, Some(100));
        assert_eq!(progress.percentage, None);
        assert_eq!(progress.known_percentage, Some(50.0));
        assert!(!progress.available_completed);
    }

    #[test]
    fn known_percentage_handles_empty_zero_and_completed() {
        let title = title(MediaKind::Anime);
        let mut aggregate = MediaAggregate {
            title,
            contents: vec![],
            sessions: vec![],
        };
        assert_eq!(progress_for(&aggregate).known_percentage, None);
        aggregate.contents.push(content(
            aggregate.title.id.clone(),
            "T1",
            Some(12),
            0,
            CanonStatus::Canon,
        ));
        assert_eq!(progress_for(&aggregate).known_percentage, Some(0.0));
        aggregate.contents[0].watched_episodes = 12;
        assert_eq!(progress_for(&aggregate).known_percentage, Some(100.0));
        aggregate.contents[0].total_episodes = None;
        assert_eq!(progress_for(&aggregate).known_percentage, None);
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
    fn ranking_keeps_every_scoped_title_with_a_score() {
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

        assert_eq!(statistics.top_titles.len(), 7);
        assert!(statistics
            .top_titles
            .iter()
            .any(|(_, name, _)| name == "Película independiente"));
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
            validate_progress_change(4, 13, Some(12), today, today, None).unwrap_err(),
            MediaError::ProgressExceedsTotal
        );
        assert_eq!(
            validate_progress_change(4, 5, None, today.succ_opt().unwrap(), today, None)
                .unwrap_err(),
            MediaError::FutureSession
        );
        assert_eq!(
            validate_progress_change(
                4,
                5,
                Some(12),
                NaiveDate::from_ymd_opt(2026, 4, 5).unwrap(),
                today,
                Some(NaiveDate::from_ymd_opt(2026, 4, 6).unwrap()),
            )
            .unwrap_err(),
            MediaError::SessionBeforeRelease
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
            registration_id: uuid::Uuid::new_v4().to_string(),
            is_rewatch: false,
            run_id: None,
            run_status: "inProgress".into(),
        };
        assert_eq!(session.episode_number, Some(2));
    }

    fn history_episode(
        content_id: &MediaContentId,
        registration: &str,
        date: &str,
        episode: u32,
        internal_rewatch: bool,
    ) -> WatchSession {
        WatchSession {
            id: format!("{registration}:{episode}"),
            title_id: None,
            content_id: Some(content_id.clone()),
            watched_on: NaiveDate::parse_from_str(date, "%Y-%m-%d").unwrap(),
            delta: 1,
            episode_number: Some(episode),
            source: SessionSource::ManualAdjustment,
            registration_id: registration.into(),
            is_rewatch: internal_rewatch,
            run_id: None,
            run_status: "inProgress".into(),
        }
    }

    #[test]
    fn chronological_rewatch_uses_viewing_dates_not_insertion_flags() {
        let content_id = MediaContentId::generate();
        let mut sessions: Vec<_> = (1..=170)
            .map(|ep| history_episode(&content_id, "base", "2026-03-30", ep, false))
            .collect();
        sessions.extend(
            (1..=170).map(|ep| history_episode(&content_id, "added-later", "2022-05-02", ep, true)),
        );
        let repeated = chronological_rewatch_sessions(&sessions);
        assert_eq!(repeated.len(), 170);
        assert!(sessions
            .iter()
            .take(170)
            .all(|session| repeated.contains(&session.id)));
        assert!(sessions
            .iter()
            .skip(170)
            .all(|session| !repeated.contains(&session.id)));
        // Classification does not rewrite the bookkeeping data or order.
        assert!(!sessions[0].is_rewatch);
        assert!(sessions[170].is_rewatch);
        sessions.reverse();
        assert_eq!(chronological_rewatch_sessions(&sessions), repeated);
    }

    #[test]
    fn chronological_rewatch_recalculates_after_date_edits_and_deletion() {
        let content_id = MediaContentId::generate();
        let mut sessions = vec![
            history_episode(&content_id, "base", "2026-03-30", 1, false),
            history_episode(&content_id, "second", "2022-05-02", 1, true),
        ];
        assert_eq!(
            chronological_rewatch_sessions(&sessions),
            HashSet::from(["base:1".into()])
        );
        sessions[1].watched_on = NaiveDate::from_ymd_opt(2026, 5, 2).unwrap();
        assert_eq!(
            chronological_rewatch_sessions(&sessions),
            HashSet::from(["second:1".into()])
        );
        sessions.remove(0);
        assert!(chronological_rewatch_sessions(&sessions).is_empty());
    }

    #[test]
    fn chronological_rewatch_distinguishes_episodes_and_contents() {
        let content_id = MediaContentId::generate();
        let other_content = MediaContentId::generate();
        let sessions = vec![
            history_episode(&content_id, "first-block", "2022-05-02", 1, false),
            history_episode(&content_id, "next-block", "2022-05-03", 2, false),
            history_episode(&other_content, "other", "2023-05-02", 1, false),
            history_episode(&content_id, "partial-repeat", "2024-05-02", 1, true),
        ];
        assert_eq!(
            chronological_rewatch_sessions(&sessions),
            HashSet::from(["partial-repeat:1".into()])
        );
    }

    #[test]
    fn chronological_rewatch_same_day_has_stable_tie_breaking() {
        let content_id = MediaContentId::generate();
        let mut sessions = vec![
            history_episode(&content_id, "z-base", "2026-03-30", 1, false),
            history_episode(&content_id, "a-repeat", "2026-03-30", 1, true),
            history_episode(&content_id, "b-repeat", "2026-03-30", 1, true),
        ];
        let expected = HashSet::from(["a-repeat:1".into(), "b-repeat:1".into()]);
        assert_eq!(chronological_rewatch_sessions(&sessions), expected);
        sessions.reverse();
        assert_eq!(chronological_rewatch_sessions(&sessions), expected);
        assert!(chronological_rewatch_sessions(&[]).is_empty());
    }
}
