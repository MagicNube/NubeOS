ALTER TABLE game_runs ADD COLUMN completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1));
UPDATE game_runs SET completed = CASE WHEN finished_on IS NOT NULL THEN 1 ELSE 0 END;

ALTER TABLE reading_runs ADD COLUMN completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1));
UPDATE reading_runs SET completed = CASE WHEN finished_on IS NOT NULL THEN 1 ELSE 0 END;
