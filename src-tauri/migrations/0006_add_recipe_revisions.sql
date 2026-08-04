ALTER TABLE meals_recipes
ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1);

ALTER TABLE meals_planned_instances
ADD COLUMN source_meal_revision INTEGER CHECK (
    source_meal_revision IS NULL OR source_meal_revision >= 1
);

UPDATE meals_planned_instances
SET source_meal_revision = (
    SELECT revision
    FROM meals_recipes
    WHERE meals_recipes.id = meals_planned_instances.source_meal_id
)
WHERE source_meal_id IS NOT NULL;
