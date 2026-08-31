-- Las películas Anime pasan del progreso directo binario al mismo historial de
-- visionados independientes que las películas convencionales. Se conserva la
-- fecha de cualquier sesión explícita existente y después se retira el registro
-- legado para no mostrarlo dos veces.
INSERT INTO media_movie_viewings (id, title_id, watched_on, created_at, updated_at)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))), 2) || '-a' ||
        substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    titles.id,
    sessions.watched_on,
    sessions.created_at,
    sessions.created_at
FROM media_watch_sessions AS sessions
JOIN media_titles AS titles ON titles.id = sessions.title_id
WHERE titles.is_anime = 1
  AND titles.kind = 'movie'
  AND sessions.content_id IS NULL
  AND sessions.episode_number IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM media_movie_viewings AS viewings
      WHERE viewings.title_id = titles.id
        AND viewings.watched_on = sessions.watched_on
  );

DELETE FROM media_watch_sessions
WHERE content_id IS NULL
  AND title_id IN (
      SELECT id FROM media_titles WHERE is_anime = 1 AND kind = 'movie'
  );
