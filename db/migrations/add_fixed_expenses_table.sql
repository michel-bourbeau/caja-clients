-- Create fixed_expenses table for recurring monthly expense templates
-- These are "templates" (loyer, électricité, etc.) that generate actual expense entries each month

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add fixed_expense_id to expenses to track which entries were auto-generated
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS fixed_expense_id UUID REFERENCES fixed_expenses(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_tenant ON fixed_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_active ON fixed_expenses(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_fixed_id ON expenses(fixed_expense_id);

-- Enable RLS
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fixed_expenses from their tenant" ON fixed_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
        AND users.tenant_id = fixed_expenses.tenant_id
    )
  );

CREATE POLICY "Admin can manage fixed_expenses in their tenant" ON fixed_expenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
        AND users.tenant_id = fixed_expenses.tenant_id
    )
  );
