-- ============================================================
-- Migration: Cash Session system
-- Tables: cash_sessions, cash_session_employees,
--         cash_session_counts, cash_session_recounts
-- + column track_in_count on products
-- ============================================================

-- 1. Add track_in_count to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_in_count BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Main session table
CREATE TABLE IF NOT EXISTS cash_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name                     TEXT NOT NULL,               -- "Quart matin"
  status                   TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),

  opening_cash             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  closing_cash             NUMERIC(12, 2),

  opened_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by_id             UUID REFERENCES employees(id),
  closed_at                TIMESTAMPTZ,
  closed_by_id             UUID REFERENCES employees(id),

  -- COUNTED = employee counted from scratch
  -- CARRIED_OVER = employee confirmed previous closing values unchanged
  opening_method           TEXT NOT NULL DEFAULT 'COUNTED' CHECK (opening_method IN ('COUNTED', 'CARRIED_OVER')),
  previous_session_id      UUID REFERENCES cash_sessions(id),

  notes                    TEXT NOT NULL DEFAULT '',
  resolved                 BOOLEAN NOT NULL DEFAULT FALSE,

  -- POS aggregates (computed from transactions.cash_session_id at closing)
  total_sales              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_sales               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  card_sales               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transfer_sales           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tx_count                 INT NOT NULL DEFAULT 0,
  voids_count              INT NOT NULL DEFAULT 0,
  no_sales_count           INT NOT NULL DEFAULT 0,
  large_discounts_count    INT NOT NULL DEFAULT 0,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant
  ON cash_sessions(tenant_id, opened_at DESC);

-- 3. Employees linked to a session (multi-employee shift)
CREATE TABLE IF NOT EXISTS cash_session_employees (
  session_id   UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, employee_id)
);

-- 4. Item counts (one row per tracked product per session)
CREATE TABLE IF NOT EXISTS cash_session_counts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(id),
  variant_id            UUID,                   -- nullable: only for variant products

  -- Denormalized for historical accuracy (product may change later)
  product_name          TEXT NOT NULL,
  sku                   TEXT NOT NULL DEFAULT '',
  unit_price            NUMERIC(12, 2) NOT NULL DEFAULT 0,

  opening_qty           INT,                    -- null until counted at opening
  sold_qty              INT NOT NULL DEFAULT 0, -- filled from POS at closing
  expected_closing_qty  INT,                    -- computed: opening_qty - sold_qty
  closing_qty           INT,                    -- null until counted at closing

  recount_attempts      INT NOT NULL DEFAULT 0,
  notes                 TEXT NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_session_counts_session
  ON cash_session_counts(session_id);

-- 5. Recount audit trail
CREATE TABLE IF NOT EXISTS cash_session_recounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,

  type            TEXT NOT NULL CHECK (type IN ('ITEM', 'CASH')),
  count_id        UUID REFERENCES cash_session_counts(id), -- null when type = CASH

  attempt_number  INT NOT NULL,
  previous_value  NUMERIC(12, 2) NOT NULL,
  new_value       NUMERIC(12, 2) NOT NULL,

  recounted_by_id UUID REFERENCES employees(id),
  recounted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_session_recounts_session
  ON cash_session_recounts(session_id);

-- 6. Link transactions to their cash session (for sales aggregation)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES cash_sessions(id);

CREATE INDEX IF NOT EXISTS idx_transactions_cash_session
  ON transactions(cash_session_id)
  WHERE cash_session_id IS NOT NULL;

-- 7. Employee risk scores (rebuilt daily via cron or on-demand)
CREATE TABLE IF NOT EXISTS employee_risk_scores (
  employee_id              UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  period_start             DATE NOT NULL,
  period_end               DATE NOT NULL,

  total_sessions           INT NOT NULL DEFAULT 0,
  total_recounts           INT NOT NULL DEFAULT 0,
  total_negative_variance  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_positive_variance  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  variance_ratio           NUMERIC(5, 4),        -- neg / (neg + pos)

  voids_count              INT NOT NULL DEFAULT 0,
  no_sales_count           INT NOT NULL DEFAULT 0,
  large_discounts_count    INT NOT NULL DEFAULT 0,

  risk_score               INT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  trend                    TEXT NOT NULL DEFAULT 'STABLE' CHECK (trend IN ('UP', 'STABLE', 'DOWN')),
  computed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (employee_id, period_start)
);

-- 8. RLS: tenant isolation
ALTER TABLE cash_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session_counts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session_recounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_risk_scores  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; app uses service role key via getSupabaseAdmin()
-- so no user-level policies are needed for server-side API routes.
-- Add policies here if direct client access is ever introduced.
