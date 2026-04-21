-- Create loyal_customers table
CREATE TABLE IF NOT EXISTS loyal_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  card_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_accumulated DECIMAL(12, 2) DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  last_purchase_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create loyalty_rewards table (historique des récompenses)
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyal_customer_id UUID NOT NULL REFERENCES loyal_customers(id) ON DELETE CASCADE,
  reward_date TIMESTAMP DEFAULT NOW(),
  amount_at_reward DECIMAL(12, 2) NOT NULL,
  reward_type TEXT DEFAULT 'POINTS',
  reward_value DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create loyalty_transactions table (historique des achats)
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyal_customer_id UUID NOT NULL REFERENCES loyal_customers(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyal_customers_tenant_id ON loyal_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyal_customers_card_number ON loyal_customers(card_number);
CREATE INDEX IF NOT EXISTS idx_loyal_customers_phone ON loyal_customers(phone);
CREATE INDEX IF NOT EXISTS idx_loyal_customers_email ON loyal_customers(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer_id ON loyalty_rewards(loyal_customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(loyal_customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_transaction_id ON loyalty_transactions(transaction_id);

-- Add RLS policies for loyal_customers
ALTER TABLE loyal_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's loyal customers"
  ON loyal_customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.tenant_id = loyal_customers.tenant_id AND users.id = auth.uid()
  ));

CREATE POLICY "Users can create loyal customers in their tenant"
  ON loyal_customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.tenant_id = loyal_customers.tenant_id AND users.id = auth.uid()
  ));

CREATE POLICY "Users can update loyal customers in their tenant"
  ON loyal_customers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.tenant_id = loyal_customers.tenant_id AND users.id = auth.uid()
  ));

CREATE POLICY "Users can delete loyal customers in their tenant"
  ON loyal_customers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.tenant_id = loyal_customers.tenant_id AND users.id = auth.uid()
  ));

-- Add RLS policies for loyalty_rewards
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rewards for their tenant's customers"
  ON loyalty_rewards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loyal_customers 
    INNER JOIN users ON users.tenant_id = loyal_customers.tenant_id 
    WHERE loyal_customers.id = loyalty_rewards.loyal_customer_id 
      AND users.id = auth.uid()
  ));

CREATE POLICY "Users can create rewards in their tenant"
  ON loyalty_rewards FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM loyal_customers 
    INNER JOIN users ON users.tenant_id = loyal_customers.tenant_id 
    WHERE loyal_customers.id = loyalty_rewards.loyal_customer_id 
      AND users.id = auth.uid()
  ));

-- Add RLS policies for loyalty_transactions
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions for their tenant's customers"
  ON loyalty_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loyal_customers 
    INNER JOIN users ON users.tenant_id = loyal_customers.tenant_id 
    WHERE loyal_customers.id = loyalty_transactions.loyal_customer_id 
      AND users.id = auth.uid()
  ));

CREATE POLICY "Users can create transactions in their tenant"
  ON loyalty_transactions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM loyal_customers 
    INNER JOIN users ON users.tenant_id = loyal_customers.tenant_id 
    WHERE loyal_customers.id = loyalty_transactions.loyal_customer_id 
      AND users.id = auth.uid()
  ));
