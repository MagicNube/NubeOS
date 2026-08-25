ALTER TABLE reading_books ADD COLUMN cover_position_x REAL NOT NULL DEFAULT 50.0 CHECK (cover_position_x >= 0.0 AND cover_position_x <= 100.0);
ALTER TABLE reading_books ADD COLUMN cover_position_y REAL NOT NULL DEFAULT 50.0 CHECK (cover_position_y >= 0.0 AND cover_position_y <= 100.0);
ALTER TABLE reading_books ADD COLUMN cover_zoom REAL NOT NULL DEFAULT 1.0 CHECK (cover_zoom >= 1.0 AND cover_zoom <= 2.0);

ALTER TABLE games ADD COLUMN cover_position_x REAL NOT NULL DEFAULT 50.0 CHECK (cover_position_x >= 0.0 AND cover_position_x <= 100.0);
ALTER TABLE games ADD COLUMN cover_position_y REAL NOT NULL DEFAULT 50.0 CHECK (cover_position_y >= 0.0 AND cover_position_y <= 100.0);
ALTER TABLE games ADD COLUMN cover_zoom REAL NOT NULL DEFAULT 1.0 CHECK (cover_zoom >= 1.0 AND cover_zoom <= 2.0);
