-- ============================================================
-- Stock Movements History Table
-- Tracks every stock change: sales, manual adjustments, restocks
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Denormalized names for display (survives product renames)
  product_name TEXT NOT NULL,
  variant_label TEXT,

  -- Movement type
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'sale',        -- Stock out via POS transaction
    'restock',     -- Stock in (new inventory received)
    'adjustment',  -- Manual correction (inventory count)
    'return',      -- Customer return (stock in)
    'damage',      -- Loss / damaged goods (stock out)
    'initial'      -- Initial stock when product is created
  )),

  quantity_change  INTEGER NOT NULL,   -- Positive = in, Negative = out
  quantity_before  INTEGER NOT NULL DEFAULT 0,
  quantity_after   INTEGER NOT NULL DEFAULT 0,

  -- Optional link to the transaction ID (for 'sale' type)
  reference_id TEXT,

  notes      TEXT,
  created_by TEXT,   -- email or user ID of who triggered this

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant     ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product    ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant    ON stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type       ON stock_movements(tenant_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created    ON stock_movements(tenant_id, created_at DESC);

-- Row Level Security
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow tenant-scoped access (adjust to your existing RLS pattern)
CREATE POLICY "tenant_stock_movements" ON stock_movements
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
