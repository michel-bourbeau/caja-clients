-- Migration: Add theme customization fields to tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT 'slate',
ADD COLUMN IF NOT EXISTS font_size TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing records with defaults
UPDATE tenant_settings 
SET theme_color = 'slate', font_size = 'normal' 
WHERE theme_color IS NULL OR font_size IS NULL;
