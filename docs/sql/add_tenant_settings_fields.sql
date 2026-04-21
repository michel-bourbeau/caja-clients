-- Migration: Add company info and POS config fields to tenant_settings
-- Run this in Supabase SQL Editor

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS company_phone   text,
  ADD COLUMN IF NOT EXISTS company_email   text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_ruc     text,
  ADD COLUMN IF NOT EXISTS pos_config      jsonb NOT NULL DEFAULT '{"roundTotal": false, "printReceipt": true}';
