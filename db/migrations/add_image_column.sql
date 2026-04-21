-- Add image column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;

-- Add comment
COMMENT ON COLUMN products.image IS 'URL of the product image stored in Supabase Storage';
