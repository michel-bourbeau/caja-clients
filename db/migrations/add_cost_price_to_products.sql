-- Add cost price tracking to products and variants
-- This allows us to calculate profit margins on each sale

-- 1. Add cost_price to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;

-- 2. Add cost_price to product_variants table
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products(cost_price);
CREATE INDEX IF NOT EXISTS idx_product_variants_cost_price ON product_variants(cost_price);

-- 4. Add comments for documentation
COMMENT ON COLUMN products.cost_price IS 'Cost price (purchase price) of the product - used to calculate profit margins';
COMMENT ON COLUMN product_variants.cost_price IS 'Cost price (purchase price) of the variant - used to calculate profit margins';
