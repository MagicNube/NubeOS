CREATE TABLE meals_product_shopping_preferences (
    product_id TEXT PRIMARY KEY NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('grams', 'units')),
    FOREIGN KEY (product_id) REFERENCES meals_products(id) ON DELETE CASCADE
);
