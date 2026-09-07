CREATE TABLE media_content_runs (
    id TEXT PRIMARY KEY NOT NULL,
    content_id TEXT NOT NULL REFERENCES media_contents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'inProgress' CHECK(status IN ('inProgress', 'completed', 'interrupted'))
);

ALTER TABLE media_watch_sessions ADD COLUMN run_id TEXT REFERENCES media_content_runs(id);

INSERT INTO media_content_runs(id, content_id)
SELECT DISTINCT CASE WHEN is_rewatch = 0 THEN content_id || ':base' ELSE content_id || ':run:' || registration_id END, content_id
FROM media_watch_sessions WHERE content_id IS NOT NULL AND episode_number IS NOT NULL;

UPDATE media_watch_sessions
SET run_id = CASE WHEN is_rewatch = 0 THEN content_id || ':base' ELSE content_id || ':run:' || registration_id END
WHERE content_id IS NOT NULL AND episode_number IS NOT NULL;

UPDATE media_content_runs SET status = 'completed'
WHERE (SELECT COUNT(DISTINCT episode_number) FROM media_watch_sessions WHERE run_id = media_content_runs.id)
    >= (SELECT COALESCE(total_episodes, CASE WHEN kind != 'season' THEN 1 END) FROM media_contents WHERE id = media_content_runs.content_id);

CREATE INDEX idx_media_content_runs_content ON media_content_runs(content_id);
CREATE INDEX idx_media_watch_sessions_run_episode ON media_watch_sessions(run_id, episode_number);
