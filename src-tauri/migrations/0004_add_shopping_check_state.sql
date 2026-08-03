-- Una marca semanal indica que la línea de compra se ha comprobado. No altera
-- la disponibilidad ni pretende ser un historial de compras.

ALTER TABLE meals_weekly_coverage
ADD COLUMN is_checked INTEGER NOT NULL DEFAULT 0 CHECK (is_checked IN (0, 1));
