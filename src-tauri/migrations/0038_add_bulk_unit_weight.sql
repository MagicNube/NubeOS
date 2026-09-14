ALTER TABLE meals_product_presentations
ADD COLUMN approximate_grams_per_unit REAL
CHECK (approximate_grams_per_unit IS NULL OR approximate_grams_per_unit > 0);
