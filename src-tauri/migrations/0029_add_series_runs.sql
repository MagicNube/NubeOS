CREATE TABLE media_series_runs (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT NOT NULL,
    started_on TEXT NOT NULL,
    finished_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (title_id) REFERENCES media_titles(id) ON DELETE CASCADE,
    CHECK (finished_on IS NULL OR finished_on >= started_on)
);

CREATE UNIQUE INDEX idx_media_series_runs_one_open
ON media_series_runs(title_id) WHERE finished_on IS NULL;

CREATE INDEX idx_media_series_runs_title_date
ON media_series_runs(title_id, COALESCE(finished_on, started_on) DESC);

INSERT INTO media_series_runs (id, title_id, started_on, finished_on, created_at, updated_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
       substr(lower(hex(randomblob(2))), 2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) ||
       substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
       id, started_on, finished_on, created_at, updated_at
FROM media_titles
WHERE kind = 'series' AND is_anime = 0 AND started_on IS NOT NULL;
