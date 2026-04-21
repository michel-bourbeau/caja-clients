-- Add cashier_name column to transactions table
-- This column stores the name of the cashier who completed the transaction

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cashier_name TEXT DEFAULT 'Unknown';

-- Add an index for filtering by cashier_name
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_name ON transactions(cashier_name);

-- Add composite index for filtering by tenant and cashier
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_cashier ON transactions(tenant_id, cashier_name);
