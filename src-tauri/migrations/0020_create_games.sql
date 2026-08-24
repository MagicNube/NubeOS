CREATE TABLE games (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    game_status TEXT NOT NULL CHECK (game_status IN ('pending', 'playing', 'paused', 'completed', 'abandoned')),
    score REAL NULL CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    opinion TEXT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    cover_file_name TEXT NULL,
    cover_mime_type TEXT NULL,
    cover_size_bytes INTEGER NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE game_runs (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    started_on TEXT NULL,
    finished_on TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (started_on IS NOT NULL OR finished_on IS NOT NULL),
    CHECK (started_on IS NULL OR finished_on IS NULL OR started_on <= finished_on)
);

CREATE INDEX idx_games_active ON games(is_archived, updated_at DESC);
CREATE INDEX idx_games_status ON games(game_status);
CREATE INDEX idx_games_name ON games(normalized_name);
CREATE INDEX idx_game_runs_game ON game_runs(game_id, COALESCE(finished_on, started_on) DESC);
CREATE UNIQUE INDEX idx_game_runs_one_open
    ON game_runs(game_id)
    WHERE finished_on IS NULL;
