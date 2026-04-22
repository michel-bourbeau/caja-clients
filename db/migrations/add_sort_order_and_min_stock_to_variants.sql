-- Add sort_order and min_stock columns to product_variants table
-- Run in Supabase SQL editor

-- 1. Add sort_order column to product_variants
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Add min_stock column to product_variants
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0;

-- 3. Initialize sort_order based on creation order within each product
WITH ranked AS (
  SELECT 
    id, 
    product_id,
    row_number() OVER (PARTITION BY product_id ORDER BY created_at) - 1 AS rn
  FROM product_variants
)
UPDATE product_variants
SET sort_order = ranked.rn
FROM ranked
WHERE product_variants.id = ranked.id;
