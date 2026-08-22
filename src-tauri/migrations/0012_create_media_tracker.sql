CREATE TABLE media_titles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
    normalized_name TEXT NOT NULL,
    alternative_title TEXT,
    normalized_alternative_title TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('anime', 'series', 'movie')),
    tracking_status TEXT NOT NULL CHECK (tracking_status IN ('watching', 'pending', 'paused', 'completed', 'dropped', 'waiting_content')),
    score REAL CHECK (score IS NULL OR (score BETWEEN 1 AND 10 AND score * 2 = CAST(score * 2 AS INTEGER))),
    opinion TEXT CHECK (opinion IS NULL OR length(opinion) <= 4000),
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    watched_units INTEGER NOT NULL DEFAULT 0 CHECK (watched_units BETWEEN 0 AND 1),
    cover_file_name TEXT,
    cover_mime_type TEXT CHECK (cover_mime_type IS NULL OR cover_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    cover_size_bytes INTEGER CHECK (cover_size_bytes IS NULL OR cover_size_bytes > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((cover_file_name IS NULL) = (cover_mime_type IS NULL)),
    CHECK ((cover_file_name IS NULL) = (cover_size_bytes IS NULL)),
    CHECK (kind = 'movie' OR watched_units = 0)
);

CREATE TABLE media_contents (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT NOT NULL REFERENCES media_titles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
    kind TEXT NOT NULL CHECK (kind IN ('season', 'movie', 'ova', 'special')),
    tracking_status TEXT NOT NULL CHECK (tracking_status IN ('watching', 'pending', 'paused', 'completed', 'dropped', 'waiting_content')),
    canon_status TEXT NOT NULL CHECK (canon_status IN ('canon', 'recommended', 'optional', 'omitted')),
    total_episodes INTEGER CHECK (total_episodes IS NULL OR total_episodes > 0),
    watched_episodes INTEGER NOT NULL DEFAULT 0 CHECK (watched_episodes >= 0),
    studio TEXT CHECK (studio IS NULL OR length(studio) <= 150),
    score REAL CHECK (score IS NULL OR (score BETWEEN 1 AND 10 AND score * 2 = CAST(score * 2 AS INTEGER))),
    opinion TEXT CHECK (opinion IS NULL OR length(opinion) <= 4000),
    released_on TEXT,
    finished_on TEXT,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (title_id, position),
    CHECK (total_episodes IS NULL OR watched_episodes <= total_episodes),
    CHECK (released_on IS NULL OR finished_on IS NULL OR released_on <= finished_on)
);

CREATE TABLE media_watch_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT REFERENCES media_titles(id) ON DELETE CASCADE,
    content_id TEXT REFERENCES media_contents(id) ON DELETE CASCADE,
    watched_on TEXT NOT NULL,
    delta INTEGER NOT NULL CHECK (delta != 0),
    source TEXT NOT NULL CHECK (source IN ('quick_add', 'manual_adjustment')),
    created_at TEXT NOT NULL,
    CHECK ((title_id IS NOT NULL AND content_id IS NULL) OR (title_id IS NULL AND content_id IS NOT NULL))
);

CREATE INDEX idx_media_titles_library
ON media_titles(is_archived, kind, tracking_status, updated_at DESC);

CREATE INDEX idx_media_contents_title
ON media_contents(title_id, position);

CREATE INDEX idx_media_sessions_title_date
ON media_watch_sessions(title_id, watched_on DESC, created_at DESC);

CREATE INDEX idx_media_sessions_content_date
ON media_watch_sessions(content_id, watched_on DESC, created_at DESC);
