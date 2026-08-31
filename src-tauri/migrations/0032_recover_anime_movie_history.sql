-- Las películas Anime antiguas podían quedar marcadas como vistas únicamente por
-- elegir el estado Terminado. Si existe una fecha explícita, se conserva como
-- historial real; sin fecha, se recupera el estado editable pero no se inventa
-- un visionado.
INSERT INTO media_watch_sessions
    (id, title_id, content_id, watched_on, delta, source, created_at, episode_number)
SELECT
    'recovered-anime-movie-' || titles.id,
    titles.id,
    NULL,
    titles.finished_on,
    1,
    'manual_adjustment',
    datetime('now'),
    1
FROM media_titles AS titles
WHERE titles.is_anime = 1
  AND titles.kind = 'movie'
  AND titles.watched_units = 1
  AND titles.finished_on IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM media_watch_sessions AS sessions
      WHERE sessions.title_id = titles.id
        AND sessions.episode_number IS NOT NULL
  );

UPDATE media_titles
SET watched_units = 0,
    finished_on = NULL
WHERE is_anime = 1
  AND kind = 'movie'
  AND watched_units = 1
  AND NOT EXISTS (
      SELECT 1 FROM media_watch_sessions AS sessions
      WHERE sessions.title_id = media_titles.id
        AND sessions.episode_number IS NOT NULL
  );
