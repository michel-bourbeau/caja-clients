-- Migration: Create time_entries table for employee attendance (check-in / check-out)
-- Supports multiple shifts per day (split shifts)
-- Drop old table if it exists with a different schema (no production data yet)

DROP TABLE IF EXISTS time_entries CASCADE;

CREATE TABLE time_entries (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out   TIMESTAMPTZ,          -- NULL = employee is currently clocked in
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Allow service_role (admin client) full access
CREATE POLICY "service_role_time_entries" ON time_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_time_entries_tenant_id   ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX idx_time_entries_check_in    ON time_entries(check_in DESC);
