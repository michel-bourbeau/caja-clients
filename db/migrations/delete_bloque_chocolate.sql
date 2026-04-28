-- Delete products and category for "Bloque de Chocolate"
-- This script removes all products from the category and then deletes the category itself
-- TENANT: c1d44fe1-a862-4b6b-afbd-8566f61099a2

-- First, delete all products that belong to "Bloque de Chocolate" category for this tenant
DELETE FROM products 
WHERE category_id = (
  SELECT id FROM product_categories 
  WHERE name = 'Bloque de Chocolate'
  AND tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
);

-- Then, delete the category itself for this tenant
DELETE FROM product_categories 
WHERE name = 'Bloque de Chocolate'
AND tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
