ALTER TABLE media_titles
ADD COLUMN is_anime INTEGER NOT NULL DEFAULT 0 CHECK (is_anime IN (0, 1));

ALTER TABLE media_titles
ADD COLUMN started_on TEXT;

ALTER TABLE media_titles
ADD COLUMN finished_on TEXT;

ALTER TABLE media_titles
ADD COLUMN current_season INTEGER CHECK (current_season IS NULL OR current_season > 0);

ALTER TABLE media_titles
ADD COLUMN current_episode INTEGER CHECK (current_episode IS NULL OR current_episode > 0);

UPDATE media_titles SET is_anime = 1 WHERE kind = 'anime';

CREATE INDEX idx_media_titles_area
ON media_titles(is_archived, is_anime, kind, tracking_status, updated_at DESC);
