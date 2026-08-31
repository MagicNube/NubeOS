-- Las primeras versiones del editor solo permitían ampliar entre 1× y 2×.
-- El editor actual también permite alejar hasta mostrar la portada completa.
PRAGMA writable_schema = ON;

UPDATE sqlite_master
SET sql = replace(sql,
    'cover_zoom >= 1.0 AND cover_zoom <= 2.0',
    'cover_zoom >= 0.25 AND cover_zoom <= 3.0')
WHERE type = 'table'
  AND name IN ('media_titles', 'reading_books', 'games');

PRAGMA writable_schema = RESET;
