-- Add loyalty module columns to tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS loyalty_module_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_reward_threshold DECIMAL(12, 2) DEFAULT 2000,
ADD COLUMN IF NOT EXISTS loyalty_reward_type TEXT DEFAULT 'DISCOUNT_PERCENT',
ADD COLUMN IF NOT EXISTS loyalty_reward_value DECIMAL(12, 2) DEFAULT 10;

-- Add updated_at column if it doesn't exist
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create an index on tenant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
