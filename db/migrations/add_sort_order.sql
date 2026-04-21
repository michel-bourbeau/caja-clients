-- Add sort_order to categories and products for custom ordering
-- Run in Supabase SQL editor

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order from current alphabetical order for categories
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY name) - 1 AS rn
  FROM product_categories
)
UPDATE product_categories
SET sort_order = ranked.rn
FROM ranked
WHERE product_categories.id = ranked.id;

-- Initialize sort_order from current created_at order for products
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at) - 1 AS rn
  FROM products
)
UPDATE products
SET sort_order = ranked.rn
FROM ranked
WHERE products.id = ranked.id;
