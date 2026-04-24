-- Migration: Add USD exchange rate to tenant_settings
-- This allows tenants to configure the USD to NIO exchange rate for POS transactions

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS usd_exchange_rate numeric NOT NULL DEFAULT 37.00;

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS pos_config jsonb DEFAULT '{"roundTotal": false, "printReceipt": true}';

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS payroll_config jsonb DEFAULT '{"frequency": "weekly", "weekStartDay": 1, "monthStartDay": 1}';

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'slate';

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'normal';

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS company_phone text;

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS company_email text;

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS company_website text;

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS company_ruc text;

-- Add currency_paid to transactions to track payment currency
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency_paid text DEFAULT 'NIO';

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS usd_amount_received numeric DEFAULT 0;

COMMENT ON COLUMN tenant_settings.usd_exchange_rate IS 'Exchange rate USD to NIO (e.g., 37.00 means 1 USD = 37 NIO)';
COMMENT ON COLUMN transactions.currency_paid IS 'Currency used for payment: NIO or USD';
COMMENT ON COLUMN transactions.usd_amount_received IS 'Amount received in USD if payment was in USD';
