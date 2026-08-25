ALTER TABLE media_titles ADD COLUMN cover_zoom REAL NOT NULL DEFAULT 1.0
    CHECK (cover_zoom >= 1.0 AND cover_zoom <= 2.0);
