-- Salary payments: each row = one paycheck issued to an employee
-- Tracks the period, hours worked, hourly rate and amount paid.

CREATE TABLE IF NOT EXISTS salary_payments (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id    uuid          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start   date          NOT NULL,
  period_end     date          NOT NULL,
  hours_worked   numeric       NOT NULL DEFAULT 0,
  hourly_rate    numeric       NOT NULL DEFAULT 0,
  amount         numeric       NOT NULL DEFAULT 0,
  notes          text,
  paid_at        date          NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_tenant   ON salary_payments(tenant_id);

ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_salary_payments" ON salary_payments
  USING (true) WITH CHECK (true);

-- Ensure hire_date exists on employees (may already be there)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date date;
