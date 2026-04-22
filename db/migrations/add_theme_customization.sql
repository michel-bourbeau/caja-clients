-- Migration: Add theme customization fields to tenant_settings

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'slate',
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS logo_url TEXT;
