-- Add last_reward_date column to loyal_customers table
ALTER TABLE loyal_customers
ADD COLUMN IF NOT EXISTS last_reward_date TIMESTAMP NULL;

-- Create an index for sorting by last_reward_date
CREATE INDEX IF NOT EXISTS idx_loyal_customers_last_reward_date ON loyal_customers(last_reward_date DESC);
