-- Create bonus_payments table for Aguinaldo (13th month)
CREATE TABLE IF NOT EXISTS bonus_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_year INT NOT NULL, -- e.g., 2024 for Dec 2024 payment (cycle Dec 2023 - Nov 2024)
  calculated_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bonus_per_employee_year UNIQUE (tenant_id, employee_id, cycle_year)
);

CREATE INDEX idx_bonus_payments_tenant ON bonus_payments(tenant_id);
CREATE INDEX idx_bonus_payments_employee ON bonus_payments(employee_id);
CREATE INDEX idx_bonus_payments_paid_at ON bonus_payments(paid_at);

-- Create vacation_payments table for Vacaciones
CREATE TABLE IF NOT EXISTS vacation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  days_used NUMERIC(5, 1) NOT NULL, -- e.g., 3.5 days
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monetary_value NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacation_payments_tenant ON vacation_payments(tenant_id);
CREATE INDEX idx_vacation_payments_employee ON vacation_payments(employee_id);
CREATE INDEX idx_vacation_payments_paid_at ON vacation_payments(paid_at);
