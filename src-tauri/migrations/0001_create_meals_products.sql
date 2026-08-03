CREATE TABLE meals_products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    category TEXT NOT NULL CHECK (category IN ('vegetable', 'fruit', 'yogurt', 'meat', 'fish', 'other')),
    protein_grams_per_100g REAL NOT NULL CHECK (protein_grams_per_100g >= 0),
    carbohydrate_grams_per_100g REAL NOT NULL CHECK (carbohydrate_grams_per_100g >= 0),
    fat_grams_per_100g REAL NOT NULL CHECK (fat_grams_per_100g >= 0),
    kilocalories_per_100g REAL NOT NULL CHECK (kilocalories_per_100g >= 0),
    store TEXT,
    brand TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived'))
);

CREATE TABLE meals_product_presentations (
    product_id TEXT PRIMARY KEY NOT NULL REFERENCES meals_products(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('package', 'bulk_by_weight', 'bulk_by_unit')),
    label TEXT,
    total_grams REAL,
    price_cents INTEGER,
    units_per_package INTEGER,
    price_cents_per_kilogram INTEGER,
    grams_per_unit REAL,
    price_cents_per_unit INTEGER,
    CHECK (
        (
            kind = 'package'
            AND label IS NOT NULL
            AND length(trim(label)) > 0
            AND total_grams IS NOT NULL
            AND total_grams > 0
            AND (price_cents IS NULL OR price_cents >= 0)
            AND (units_per_package IS NULL OR units_per_package > 0)
            AND price_cents_per_kilogram IS NULL
            AND grams_per_unit IS NULL
            AND price_cents_per_unit IS NULL
        )
        OR (
            kind = 'bulk_by_weight'
            AND label IS NULL
            AND total_grams IS NULL
            AND price_cents IS NULL
            AND units_per_package IS NULL
            AND (price_cents_per_kilogram IS NULL OR price_cents_per_kilogram >= 0)
            AND grams_per_unit IS NULL
            AND price_cents_per_unit IS NULL
        )
        OR (
            kind = 'bulk_by_unit'
            AND label IS NULL
            AND total_grams IS NULL
            AND price_cents IS NULL
            AND units_per_package IS NULL
            AND price_cents_per_kilogram IS NULL
            AND (grams_per_unit IS NULL OR grams_per_unit > 0)
            AND (price_cents_per_unit IS NULL OR price_cents_per_unit >= 0)
        )
    )
);
