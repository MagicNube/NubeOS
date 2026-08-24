CREATE TABLE media_movie_viewings (
    id TEXT PRIMARY KEY NOT NULL,
    title_id TEXT NOT NULL REFERENCES media_titles(id) ON DELETE CASCADE,
    watched_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_media_movie_viewings_title_date
ON media_movie_viewings(title_id, watched_on DESC);

INSERT INTO media_movie_viewings (id, title_id, watched_on, created_at, updated_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
       titles.id,
       COALESCE(titles.finished_on, MAX(sessions.watched_on)),
       datetime('now'), datetime('now')
FROM media_titles titles
LEFT JOIN media_watch_sessions sessions ON sessions.title_id = titles.id AND sessions.content_id IS NULL
WHERE titles.kind = 'movie' AND titles.is_anime = 0
GROUP BY titles.id
HAVING COALESCE(titles.finished_on, MAX(sessions.watched_on)) IS NOT NULL;
