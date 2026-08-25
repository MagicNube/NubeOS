ALTER TABLE media_titles ADD COLUMN cover_position_x REAL NOT NULL DEFAULT 50
    CHECK (cover_position_x >= 0 AND cover_position_x <= 100);
ALTER TABLE media_titles ADD COLUMN cover_position_y REAL NOT NULL DEFAULT 50
    CHECK (cover_position_y >= 0 AND cover_position_y <= 100);
