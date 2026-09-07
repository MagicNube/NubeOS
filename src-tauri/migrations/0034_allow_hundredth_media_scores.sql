-- Las puntuaciones audiovisuales pasan de décimas a centésimas sin reconstruir
-- las tablas ni alterar los valores existentes.
PRAGMA writable_schema = ON;

UPDATE sqlite_master
SET sql = replace(sql,
    'score BETWEEN 0 AND 10 AND score * 10 = CAST(score * 10 AS INTEGER)',
    'score BETWEEN 0 AND 10 AND abs(score * 100 - round(score * 100)) < 0.000001')
WHERE type = 'table'
  AND name IN ('media_titles', 'media_contents');

PRAGMA writable_schema = RESET;
