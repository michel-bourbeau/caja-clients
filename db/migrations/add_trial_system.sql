-- Add trial system to tenants
-- This migration adds support for 14-day free trials with automatic expiration

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Set trial end for existing free/non-paid tenants
UPDATE tenants 
SET trial_ends_at = now() + interval '14 days'
WHERE trial_ends_at IS NULL AND is_paid = false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends_at ON tenants(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_tenants_is_paid ON tenants(is_paid);
