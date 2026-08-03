-- Segundo incremento del módulo: franjas recomendadas y una única
-- disponibilidad manual por semana/producto. La tabla se reconstruye porque
-- SQLite no permite eliminar de forma portable la columna de compras previas.

CREATE TABLE meals_recipe_recommended_slots (
    meal_id TEXT NOT NULL REFERENCES meals_recipes(id) ON DELETE CASCADE,
    slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'snack', 'dinner', 'extra')),
    PRIMARY KEY (meal_id, slot)
);

CREATE TABLE meals_weekly_coverage_next (
    week_start TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES meals_products(id),
    available_grams REAL NOT NULL DEFAULT 0 CHECK (available_grams >= 0),
    PRIMARY KEY (week_start, product_id)
);

INSERT INTO meals_weekly_coverage_next (week_start, product_id, available_grams)
SELECT week_start, product_id, available_grams + purchased_grams
FROM meals_weekly_coverage;

DROP TABLE meals_weekly_coverage;
ALTER TABLE meals_weekly_coverage_next RENAME TO meals_weekly_coverage;
