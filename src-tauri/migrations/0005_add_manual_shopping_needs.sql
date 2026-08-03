CREATE TABLE meals_weekly_manual_needs (
    week_start TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES meals_products(id),
    grams REAL NOT NULL CHECK (grams > 0),
    PRIMARY KEY (week_start, product_id)
);
