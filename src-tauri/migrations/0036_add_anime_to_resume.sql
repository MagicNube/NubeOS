-- Amplía únicamente el estado del título Anime; conserva filas, índices y claves.
PRAGMA writable_schema = ON;
UPDATE sqlite_master
SET sql = replace(sql,
    'tracking_status IN (''watching'', ''pending'', ''paused'', ''completed'', ''dropped'', ''waiting_content'')',
    '(tracking_status IN (''watching'', ''pending'', ''paused'', ''completed'', ''dropped'', ''waiting_content'') OR (kind = ''anime'' AND tracking_status = ''to_resume''))')
WHERE type = 'table' AND name = 'media_titles';
PRAGMA writable_schema = RESET;
