UPDATE media_titles
SET genres_json = CASE name
    WHEN 'Steins Gate' THEN '["Ciencia ficción","Thriller","Viajes en el tiempo"]'
    WHEN 'Fairy Tail' THEN '["Acción","Aventura","Fantasía","Shōnen"]'
    ELSE genres_json
END
WHERE name IN ('Steins Gate', 'Fairy Tail')
  AND genres_json = '[]';

UPDATE reading_books
SET genres_json = CASE title
    WHEN 'La Asistenta' THEN '["Misterio y suspense","Ficción contemporánea"]'
    WHEN 'El Psicoanalista' THEN '["Misterio y suspense","Policíaca y crimen"]'
    WHEN 'El Secreto de la Asistenta' THEN '["Misterio y suspense","Ficción contemporánea"]'
    WHEN 'La Biblioteca de Medianoche' THEN '["Fantasía","Ficción contemporánea","Filosofía"]'
    WHEN 'El Arte de la Guerra' THEN '["Filosofía","No ficción"]'
    ELSE genres_json
END
WHERE (title IN ('La Asistenta', 'El Psicoanalista', 'El Secreto de la Asistenta') AND genres_json = '[]')
   OR title IN ('La Biblioteca de Medianoche', 'El Arte de la Guerra');

UPDATE games
SET genres_json = CASE name
    WHEN 'A Little to the Left' THEN '["Puzles"]'
    WHEN 'Balatro' THEN '["Estrategia","Roguelike"]'
    WHEN 'Blue Prince' THEN '["Puzles","Aventura","Estrategia"]'
    WHEN 'Buckshot Roulette' THEN '["Terror","Estrategia"]'
    WHEN 'Celeste' THEN '["Plataformas"]'
    WHEN 'CloverPit' THEN '["Roguelike","Terror"]'
    WHEN 'Dredge' THEN '["Aventura","Terror","RPG"]'
    WHEN 'Dungeon & Degenerate Gamblers' THEN '["Estrategia","Roguelike"]'
    WHEN 'Expedition 33' THEN '["RPG","Aventura"]'
    WHEN 'Fields of Mistria' THEN '["Simulación","RPG"]'
    WHEN 'Firewatch' THEN '["Aventura"]'
    WHEN 'Forza Horizon 6' THEN '["Carreras"]'
    WHEN 'Gris' THEN '["Plataformas","Puzles"]'
    WHEN 'Hades' THEN '["Roguelike","Acción","RPG"]'
    WHEN 'Hollow Knight' THEN '["Metroidvania","Acción","Aventura"]'
    WHEN 'Hollow Knight Silksong' THEN '["Metroidvania","Acción","Aventura"]'
    WHEN 'Inscryption' THEN '["Estrategia","Roguelike","Terror"]'
    WHEN 'Inside' THEN '["Plataformas","Puzles","Aventura"]'
    WHEN 'Katana Zero' THEN '["Acción","Plataformas"]'
    WHEN 'Little Nightmares' THEN '["Terror","Puzles","Aventura"]'
    WHEN 'Nine Sols' THEN '["Metroidvania","Acción","Plataformas"]'
    WHEN 'Outer Wilds' THEN '["Aventura","Puzles"]'
    WHEN 'Persona 5 Royal' THEN '["RPG","Novela visual"]'
    WHEN 'Phoenix Wright: Ace Attorney Trilogy' THEN '["Novela visual","Puzles"]'
    WHEN 'Pico Park' THEN '["Puzles","Plataformas"]'
    WHEN 'Pokémon Sol' THEN '["RPG","Aventura"]'
    WHEN 'Portal 2' THEN '["Puzles"]'
    WHEN 'Rocket League' THEN '["Deportes"]'
    WHEN 'Slay The Spire' THEN '["Estrategia","Roguelike"]'
    WHEN 'Stardew Valley' THEN '["Simulación","RPG"]'
    WHEN 'Stray' THEN '["Aventura","Puzles"]'
    WHEN 'The Cosmic Wheel Sisterhood' THEN '["Novela visual"]'
    WHEN 'The Count Lucanor' THEN '["Aventura","Terror","Puzles"]'
    ELSE genres_json
END
WHERE genres_json = '[]';
