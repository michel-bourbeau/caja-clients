-- Add profit tracking fields to transactions table
-- This migration enables tracking of cost of goods sold and profit per transaction

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS cost_of_goods_sold numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit numeric(12,2) DEFAULT 0;

-- Create indexes for profit-related queries
CREATE INDEX IF NOT EXISTS idx_transactions_profit ON transactions(profit);
CREATE INDEX IF NOT EXISTS idx_transactions_cogs ON transactions(cost_of_goods_sold);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_profit ON transactions(tenant_id, profit);
CREATE INDEX IF NOT EXISTS idx_transactions_created_profit ON transactions(created_at, profit);

-- Add comments for documentation
COMMENT ON COLUMN transactions.cost_of_goods_sold IS 'Sum of cost_price × quantity for all items in the transaction';
COMMENT ON COLUMN transactions.profit IS 'Gross profit = total - cost_of_goods_sold';
