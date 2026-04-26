-- Add payment management system
-- Tracks plan pricing history and tenant payment records

-- Add payment-related columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paid_until timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_price_at_subscription numeric(10,2);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_plan_price numeric(10,2);

-- Create table to store plan pricing history
-- This allows tracking price changes and showing clients their subscription price
CREATE TABLE IF NOT EXISTS plan_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan text NOT NULL CHECK (plan IN ('basic', 'professional', 'enterprise', 'custom')),
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'NIO',
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan, effective_date)
);

-- Create table to store payment history for each tenant
-- Each record represents a payment or subscription renewal
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount numeric(10,2) NOT NULL,
  paid_until timestamptz NOT NULL,
  payment_date timestamptz DEFAULT now(),
  payment_method text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_prices_plan ON plan_prices(plan);
CREATE INDEX IF NOT EXISTS idx_plan_prices_effective_date ON plan_prices(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant ON payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_paid_until ON tenants(paid_until);

-- Enable RLS (Row Level Security) on payment tables
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: plan_prices is readable by all authenticated users
CREATE POLICY "plan_prices_read" ON plan_prices
  FOR SELECT USING (true);

-- RLS Policy: plan_prices is only writable by superadmin
CREATE POLICY "plan_prices_write" ON plan_prices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@superadmin%')
  );

-- RLS Policy: payment_history is readable by tenant users or superadmin
CREATE POLICY "payment_history_read" ON payment_history
  FOR SELECT USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@superadmin%')
  );

-- RLS Policy: payment_history is only writable by superadmin
CREATE POLICY "payment_history_write" ON payment_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email LIKE '%@superadmin%')
  );
