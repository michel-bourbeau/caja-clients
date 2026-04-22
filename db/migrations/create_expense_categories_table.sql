-- Create expense_categories table for managing custom expense categories per tenant

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_status ON expense_categories(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_categories_sort ON expense_categories(tenant_id, sort_order);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view categories from their tenant" ON expense_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.tenant_id = expense_categories.tenant_id
    )
  );

CREATE POLICY "Users can manage categories in their tenant" ON expense_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id = expense_categories.tenant_id
    )
  );

-- Insert default categories for existing tenants (optional, but helpful)
-- Uncomment to auto-populate default categories
-- INSERT INTO expense_categories (tenant_id, name, description, sort_order)
-- SELECT id, 'Servicios', 'Servicios profesionales', 1 FROM tenants
-- WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE tenant_id = tenants.id)
-- ON CONFLICT DO NOTHING;
