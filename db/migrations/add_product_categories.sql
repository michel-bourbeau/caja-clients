-- Add product categories support to Supabase
-- This migration adds category management and updates the products table

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_category_per_tenant UNIQUE(tenant_id, name)
);

-- Add category_id to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Enable RLS for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see categories from their tenant
CREATE POLICY "Categories are visible to tenant users" ON product_categories
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policy: Tenant admins can insert categories
CREATE POLICY "Tenant admins can create categories" ON product_categories
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policy: Tenant admins can update categories
CREATE POLICY "Tenant admins can update categories" ON product_categories
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- RLS Policy: Tenant admins can delete categories
CREATE POLICY "Tenant admins can delete categories" ON product_categories
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Insert sample categories for the test tenant
INSERT INTO product_categories (tenant_id, name, description)
SELECT 
  id as tenant_id,
  'Électronique' as name,
  'Produits électroniques et informatiques' as description
FROM tenants
WHERE name = 'Tienda Test'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (tenant_id, name, description)
SELECT 
  id as tenant_id,
  'Accessoires' as name,
  'Accessoires et périphériques' as description
FROM tenants
WHERE name = 'Tienda Test'
ON CONFLICT DO NOTHING;

-- Update existing products to assign them to categories
UPDATE products
SET category_id = (
  SELECT id FROM product_categories 
  WHERE name = 'Électronique' 
  AND tenant_id = products.tenant_id
)
WHERE category_id IS NULL
AND (name ILIKE '%laptop%' OR name ILIKE '%monitor%' OR name ILIKE '%keyboard%');

UPDATE products
SET category_id = (
  SELECT id FROM product_categories 
  WHERE name = 'Accessoires' 
  AND tenant_id = products.tenant_id
)
WHERE category_id IS NULL
AND name ILIKE '%mouse%';
