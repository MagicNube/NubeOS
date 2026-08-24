CREATE TABLE reading_runs (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL REFERENCES reading_books(id) ON DELETE CASCADE,
    started_on TEXT,
    finished_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (started_on IS NOT NULL OR finished_on IS NOT NULL),
    CHECK (finished_on IS NULL OR started_on IS NULL OR finished_on >= started_on)
);

CREATE UNIQUE INDEX idx_reading_runs_one_open
ON reading_runs(book_id) WHERE finished_on IS NULL;

CREATE INDEX idx_reading_runs_book_date
ON reading_runs(book_id, finished_on DESC, started_on DESC);

INSERT INTO reading_runs (id, book_id, started_on, finished_on, created_at, updated_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
       id, started_on, finished_on, updated_at, updated_at
FROM reading_books
WHERE started_on IS NOT NULL OR finished_on IS NOT NULL;
