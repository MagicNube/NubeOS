ALTER TABLE media_titles ADD COLUMN primary_studio TEXT;

UPDATE media_titles
SET primary_studio = (
    SELECT trim(media_contents.studio)
    FROM media_contents
    WHERE media_contents.title_id = media_titles.id
      AND media_contents.studio IS NOT NULL
      AND trim(media_contents.studio) != ''
    ORDER BY media_contents.position
    LIMIT 1
)
WHERE is_anime = 1;
