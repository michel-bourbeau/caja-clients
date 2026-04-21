-- Add multi-format / variants support to products
-- Run this in Supabase SQL editor

-- 1. Add has_variants flag to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       text NOT NULL,          -- e.g. "15g", "30g", "45g"
  sku         text NOT NULL,
  price       numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by product
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_id  ON product_variants(tenant_id);

-- RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON product_variants
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
