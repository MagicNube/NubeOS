CREATE TABLE media_titles_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
    normalized_name TEXT NOT NULL,
    alternative_title TEXT,
    normalized_alternative_title TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('anime', 'series', 'movie')),
    tracking_status TEXT NOT NULL CHECK (tracking_status IN ('watching', 'pending', 'paused', 'completed', 'dropped', 'waiting_content')),
    score REAL CHECK (score IS NULL OR (score BETWEEN 1 AND 10 AND score * 10 = CAST(score * 10 AS INTEGER))),
    opinion TEXT CHECK (opinion IS NULL OR length(opinion) <= 4000),
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    watched_units INTEGER NOT NULL DEFAULT 0 CHECK (watched_units BETWEEN 0 AND 1),
    cover_file_name TEXT,
    cover_mime_type TEXT CHECK (cover_mime_type IS NULL OR cover_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    cover_size_bytes INTEGER CHECK (cover_size_bytes IS NULL OR cover_size_bytes > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_anime INTEGER NOT NULL DEFAULT 0 CHECK (is_anime IN (0, 1)),
    started_on TEXT,
    finished_on TEXT,
    current_season INTEGER CHECK (current_season IS NULL OR current_season > 0),
    current_episode INTEGER CHECK (current_episode IS NULL OR current_episode > 0),
    catalog_number INTEGER CHECK (catalog_number > 0),
    genres_json TEXT NOT NULL DEFAULT '[]',
    CHECK ((cover_file_name IS NULL) = (cover_mime_type IS NULL)),
    CHECK ((cover_file_name IS NULL) = (cover_size_bytes IS NULL)),
    CHECK (kind = 'movie' OR watched_units = 0)
);

WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS number
    FROM media_titles
    WHERE is_anime = 1
)
INSERT INTO media_titles_new (
    id, name, normalized_name, alternative_title, normalized_alternative_title, kind,
    tracking_status, score, opinion, is_favorite, is_archived, watched_units,
    cover_file_name, cover_mime_type, cover_size_bytes, created_at, updated_at, is_anime,
    started_on, finished_on, current_season, current_episode, catalog_number, genres_json
)
SELECT titles.id, titles.name, titles.normalized_name, titles.alternative_title,
       titles.normalized_alternative_title, titles.kind, titles.tracking_status, titles.score,
       titles.opinion, titles.is_favorite, titles.is_archived, titles.watched_units,
       titles.cover_file_name, titles.cover_mime_type, titles.cover_size_bytes,
       titles.created_at, titles.updated_at, titles.is_anime, titles.started_on,
       titles.finished_on, titles.current_season, titles.current_episode,
       numbered.number, '[]'
FROM media_titles titles
LEFT JOIN numbered ON numbered.id = titles.id;

CREATE TABLE media_contents_new (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT NOT NULL REFERENCES media_titles_new(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
    kind TEXT NOT NULL CHECK (kind IN ('season', 'movie', 'ova', 'special')),
    tracking_status TEXT NOT NULL CHECK (tracking_status IN ('watching', 'pending', 'paused', 'completed', 'dropped', 'waiting_content')),
    canon_status TEXT NOT NULL CHECK (canon_status IN ('canon', 'recommended', 'optional', 'omitted')),
    total_episodes INTEGER CHECK (total_episodes IS NULL OR total_episodes > 0),
    watched_episodes INTEGER NOT NULL DEFAULT 0 CHECK (watched_episodes >= 0),
    studio TEXT CHECK (studio IS NULL OR length(studio) <= 150),
    score REAL CHECK (score IS NULL OR (score BETWEEN 1 AND 10 AND score * 10 = CAST(score * 10 AS INTEGER))),
    opinion TEXT CHECK (opinion IS NULL OR length(opinion) <= 4000),
    released_on TEXT,
    finished_on TEXT,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_on TEXT,
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 4000),
    UNIQUE (title_id, position),
    CHECK (total_episodes IS NULL OR watched_episodes <= total_episodes),
    CHECK (released_on IS NULL OR finished_on IS NULL OR released_on <= finished_on),
    CHECK (started_on IS NULL OR finished_on IS NULL OR started_on <= finished_on)
);

INSERT INTO media_contents_new (
    id, title_id, name, kind, tracking_status, canon_status, total_episodes,
    watched_episodes, studio, score, opinion, released_on, finished_on, position,
    created_at, updated_at, started_on, notes
)
SELECT id, title_id, name, kind, tracking_status, canon_status, total_episodes,
       watched_episodes, studio, score, opinion, released_on, finished_on, position,
       created_at, updated_at, NULL, NULL
FROM media_contents;

CREATE TABLE media_watch_sessions_new (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT REFERENCES media_titles_new(id) ON DELETE CASCADE,
    content_id TEXT REFERENCES media_contents_new(id) ON DELETE CASCADE,
    watched_on TEXT NOT NULL,
    delta INTEGER NOT NULL CHECK (delta != 0),
    source TEXT NOT NULL CHECK (source IN ('quick_add', 'manual_adjustment')),
    created_at TEXT NOT NULL,
    CHECK ((title_id IS NOT NULL AND content_id IS NULL) OR (title_id IS NULL AND content_id IS NOT NULL))
);

INSERT INTO media_watch_sessions_new
SELECT id, title_id, content_id, watched_on, delta, source, created_at
FROM media_watch_sessions;

DROP TABLE media_watch_sessions;
DROP TABLE media_contents;
DROP TABLE media_titles;

ALTER TABLE media_titles_new RENAME TO media_titles;
ALTER TABLE media_contents_new RENAME TO media_contents;
ALTER TABLE media_watch_sessions_new RENAME TO media_watch_sessions;

CREATE INDEX idx_media_titles_library
ON media_titles(is_archived, kind, tracking_status, updated_at DESC);
CREATE INDEX idx_media_titles_area
ON media_titles(is_archived, is_anime, kind, tracking_status, updated_at DESC);
CREATE UNIQUE INDEX media_titles_unique_anime_catalog_number
ON media_titles(catalog_number)
WHERE is_anime = 1 AND catalog_number IS NOT NULL;
CREATE INDEX idx_media_contents_title
ON media_contents(title_id, position);
CREATE INDEX idx_media_sessions_title_date
ON media_watch_sessions(title_id, watched_on DESC, created_at DESC);
CREATE INDEX idx_media_sessions_content_date
ON media_watch_sessions(content_id, watched_on DESC, created_at DESC);

CREATE TABLE media_catalog_sequences (
    area TEXT PRIMARY KEY CHECK (area IN ('anime')),
    last_value INTEGER NOT NULL CHECK (last_value >= 0)
);

INSERT INTO media_catalog_sequences (area, last_value)
VALUES (
    'anime',
    COALESCE((SELECT MAX(catalog_number) FROM media_titles WHERE is_anime = 1), 0)
);
