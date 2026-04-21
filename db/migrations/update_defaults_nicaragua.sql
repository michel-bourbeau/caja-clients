-- Migration: Update default timezone and currency to Nicaragua
-- Run this in Supabase SQL Editor

-- Change column defaults
ALTER TABLE tenant_settings
  ALTER COLUMN timezone SET DEFAULT 'America/Managua',
  ALTER COLUMN currency SET DEFAULT 'NIO';

-- Update existing rows that still have the old defaults
UPDATE tenant_settings
  SET timezone = 'America/Managua'
  WHERE timezone IN ('America/New_York', 'America/Argentina/Buenos_Aires');

UPDATE tenant_settings
  SET currency = 'NIO'
  WHERE currency IN ('USD', 'ARS');
