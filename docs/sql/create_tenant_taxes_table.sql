-- Create tenant_taxes table
CREATE TABLE IF NOT EXISTS tenant_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_taxes_tenant_id ON tenant_taxes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_taxes_is_active ON tenant_taxes(tenant_id, is_active);

-- Enable RLS
ALTER TABLE tenant_taxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for tenant members" ON tenant_taxes
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant')::uuid OR
    auth.uid() IN (
      SELECT user_id FROM tenant_members WHERE tenant_id = current_setting('app.current_tenant')::uuid
    )
  );

CREATE POLICY "Enable write access for tenant admins" ON tenant_taxes
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM tenant_members 
      WHERE tenant_id = current_setting('app.current_tenant')::uuid AND role = 'admin'
    )
  );
