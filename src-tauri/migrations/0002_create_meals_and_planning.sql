CREATE TABLE meals_recipes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'archived'))
);

CREATE TABLE meals_recipe_ingredients (
    meal_id TEXT NOT NULL REFERENCES meals_recipes(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES meals_products(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (unit IN ('grams', 'units')),
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (meal_id, position)
);

CREATE TABLE meals_planned_instances (
    id TEXT PRIMARY KEY NOT NULL,
    week_start TEXT NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'snack', 'dinner', 'extra')),
    position INTEGER NOT NULL CHECK (position >= 0),
    source_meal_id TEXT REFERENCES meals_recipes(id),
    is_modified INTEGER NOT NULL CHECK (is_modified IN (0, 1))
);

CREATE INDEX meals_planned_instances_week_slot
ON meals_planned_instances (week_start, weekday, slot, position);

CREATE TABLE meals_planned_ingredients (
    instance_id TEXT NOT NULL REFERENCES meals_planned_instances(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES meals_products(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (unit IN ('grams', 'units')),
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (instance_id, position)
);

CREATE TABLE meals_weekly_coverage (
    week_start TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES meals_products(id),
    available_grams REAL NOT NULL DEFAULT 0 CHECK (available_grams >= 0),
    purchased_grams REAL NOT NULL DEFAULT 0 CHECK (purchased_grams >= 0),
    PRIMARY KEY (week_start, product_id)
);
