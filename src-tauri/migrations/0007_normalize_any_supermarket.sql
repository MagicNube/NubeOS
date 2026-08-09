UPDATE meals_products
SET store = NULL
WHERE store IS NOT NULL
  AND store NOT IN ('Mercadona', 'Lidl', 'Consum', 'FamilyCash');
