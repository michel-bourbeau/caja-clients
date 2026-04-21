-- Cash closing (Cierre de Caja) table
-- Records each end-of-day reconciliation performed by a cashier.
-- The system calculates expected totals from transactions;
-- the cashier declares what was physically counted / shown on the card terminal.

CREATE TABLE IF NOT EXISTS cash_closings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Period being closed (Nicaragua local date, e.g. "2026-04-21")
  closing_date  DATE NOT NULL,

  -- System-calculated totals from transactions in that date
  system_cash   NUMERIC NOT NULL DEFAULT 0,   -- sum of CASH transactions
  system_card   NUMERIC NOT NULL DEFAULT 0,   -- sum of CARD transactions
  system_transfer NUMERIC NOT NULL DEFAULT 0, -- sum of TRANSFER transactions
  system_total  NUMERIC NOT NULL DEFAULT 0,   -- all methods combined

  -- Cashier-declared amounts
  declared_cash     NUMERIC NOT NULL DEFAULT 0,  -- cash physically counted
  declared_card     NUMERIC NOT NULL DEFAULT 0,  -- card terminal report total

  -- Differences (declared - system); negative = shortage, positive = surplus
  diff_cash     NUMERIC GENERATED ALWAYS AS (declared_cash - system_cash) STORED,
  diff_card     NUMERIC GENERATED ALWAYS AS (declared_card - system_card) STORED,

  -- Metadata
  notes         TEXT,
  closed_by     TEXT,   -- cashier name / user id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one closing per tenant per date
  CONSTRAINT unique_closing_per_tenant_date UNIQUE (tenant_id, closing_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_tenant ON cash_closings (tenant_id, closing_date DESC);
