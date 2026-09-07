ALTER TABLE media_watch_sessions ADD COLUMN registration_id TEXT;
ALTER TABLE media_watch_sessions ADD COLUMN is_rewatch INTEGER NOT NULL DEFAULT 0 CHECK (is_rewatch IN (0, 1));

UPDATE media_watch_sessions
SET registration_id = COALESCE(content_id, title_id) || ':' || watched_on
WHERE registration_id IS NULL;

DROP INDEX IF EXISTS media_sessions_unique_content_episode;
DROP INDEX IF EXISTS media_sessions_unique_title_unit;

CREATE INDEX idx_media_sessions_registration
ON media_watch_sessions(registration_id);
