-- Add min_stock column to products table
-- This allows each product to have a configurable low-stock threshold.
-- When stock_quantity <= min_stock, the product is shown as low-stock in the dashboard.

ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;

-- Index to quickly query low-stock products per tenant
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products (tenant_id, stock_quantity, min_stock);
