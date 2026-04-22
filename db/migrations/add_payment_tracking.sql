-- Add payment tracking columns to transactions table
-- This migration adds discount, amount_received, and change columns
-- to enable full transaction tracking and error detection

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_received NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS change NUMERIC DEFAULT 0;

-- Add an index for filtering by payment method (already exists implicitly)
-- Add composite index for tracking CASH transactions
CREATE INDEX IF NOT EXISTS idx_transactions_payment_tracking ON transactions(tenant_id, payment_method, amount_received);

-- Add composite index for tracking discrepancies
CREATE INDEX IF NOT EXISTS idx_transactions_changes ON transactions(tenant_id, change);
