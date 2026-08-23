ALTER TABLE reading_books RENAME TO reading_books_legacy;

DROP INDEX idx_reading_books_active;
DROP INDEX idx_reading_books_status;
DROP INDEX idx_reading_books_title;

CREATE TABLE reading_books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    author TEXT NOT NULL,
    normalized_author TEXT NOT NULL,
    genres_json TEXT NOT NULL DEFAULT '[]',
    reading_status TEXT NOT NULL CHECK (reading_status IN ('pending', 'reading', 'paused', 'completed', 'abandoned')),
    score REAL NULL CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    opinion TEXT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    started_on TEXT NULL,
    finished_on TEXT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    cover_file_name TEXT,
    cover_mime_type TEXT,
    cover_size_bytes INTEGER
);

INSERT INTO reading_books (
    id, title, normalized_title, author, normalized_author, genres_json,
    reading_status, score, opinion, is_favorite, started_on, finished_on,
    is_archived, created_at, updated_at, cover_file_name, cover_mime_type,
    cover_size_bytes
)
SELECT
    id, title, normalized_title, author, normalized_author, genres_json,
    CASE WHEN reading_status = 'researching' THEN 'pending' ELSE reading_status END,
    score, opinion, is_favorite, started_on, finished_on, is_archived,
    created_at, updated_at, cover_file_name, cover_mime_type, cover_size_bytes
FROM reading_books_legacy;

DROP TABLE reading_books_legacy;

CREATE INDEX idx_reading_books_active ON reading_books(is_archived, updated_at DESC);
CREATE INDEX idx_reading_books_status ON reading_books(reading_status);
CREATE INDEX idx_reading_books_title ON reading_books(normalized_title);
