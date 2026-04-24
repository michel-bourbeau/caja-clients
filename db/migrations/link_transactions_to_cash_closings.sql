-- Migration: Link transactions to cash closings
-- This allows tracking which transactions have been included in a closing
-- to prevent double-counting when closing the cash register

-- Add cash_closing_id to transactions table to track which closing they belong to
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cash_closing_id UUID REFERENCES cash_closings(id) ON DELETE SET NULL;

-- Add closing_time to track when each closing was recorded (for multiple closings per day)
ALTER TABLE cash_closings
ADD COLUMN IF NOT EXISTS closing_time TIMESTAMPTZ DEFAULT now();

-- Add declared_transfer column for bank transfers
ALTER TABLE cash_closings
ADD COLUMN IF NOT EXISTS declared_transfer NUMERIC DEFAULT 0;

-- Add diff_transfer as a generated column
ALTER TABLE cash_closings
ADD COLUMN IF NOT EXISTS diff_transfer NUMERIC GENERATED ALWAYS AS (declared_transfer - system_transfer) STORED;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_cash_closing ON transactions(cash_closing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_unclosed ON transactions(tenant_id, cash_closing_id) 
  WHERE cash_closing_id IS NULL AND status = 'COMPLETED';

-- Update unique constraint to allow multiple closings per day (only one per tenant per moment in time)
-- Drop old constraint if it exists
ALTER TABLE cash_closings DROP CONSTRAINT IF EXISTS unique_closing_per_tenant_date;

-- Add new index for finding last closing per day
CREATE INDEX IF NOT EXISTS idx_cash_closings_latest_per_day ON cash_closings(tenant_id, closing_date DESC, closing_time DESC);

COMMENT ON COLUMN transactions.cash_closing_id IS 'FK to cash_closings - indicates this transaction was included in that closing';
COMMENT ON COLUMN cash_closings.declared_transfer IS 'Declared bank transfer amount in this closing';
