-- Create suppliers and expenses tables for expense management

-- Suppliers table (vendors/fournisseurs)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_day INTEGER,
  recurring_day_of_month INTEGER,
  status TEXT NOT NULL DEFAULT 'RECORDED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(tenant_id, is_recurring);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SUPPLIERS
CREATE POLICY "Users can view suppliers from their tenant" ON suppliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.tenant_id = suppliers.tenant_id
    )
  );

CREATE POLICY "Admin can manage suppliers in their tenant" ON suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id = suppliers.tenant_id
    )
  );

-- RLS Policies for EXPENSES
CREATE POLICY "Users can view expenses from their tenant" ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.tenant_id = expenses.tenant_id
    )
  );

CREATE POLICY "Users can create expenses in their tenant" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.tenant_id = expenses.tenant_id
    )
  );

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Admin can update any expense" ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.tenant_id = expenses.tenant_id
    )
  );
