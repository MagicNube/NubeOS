DROP INDEX media_titles_unique_anime_catalog_number;

UPDATE media_titles
SET catalog_number = NULL
WHERE is_anime = 1 AND kind = 'movie';

CREATE UNIQUE INDEX media_titles_unique_anime_catalog_number
ON media_titles(catalog_number)
WHERE is_anime = 1 AND kind = 'anime' AND catalog_number IS NOT NULL;

UPDATE media_catalog_sequences
SET last_value = COALESCE((
    SELECT MAX(catalog_number)
    FROM media_titles
    WHERE is_anime = 1 AND kind = 'anime'
), 0)
WHERE area = 'anime';
