-- Add discount column to transactions table
-- This migration adds support for discounts on sales

ALTER TABLE transactions 
ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0 NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN transactions.discount IS 'Discount amount applied to the transaction (in the transaction currency)';
