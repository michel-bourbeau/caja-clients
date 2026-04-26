-- ============================================================================
-- MIGRATION: Ventes (Ancien Système) → Transactions (Caja-Clients)
-- ============================================================================
-- Tenant: Choco Rico (c1d44fe1-a862-4b6b-afbd-8566f61099a2)
-- Date: 2026-04-26
-- ============================================================================

BEGIN;

-- Configuration des variables
DO $$
DECLARE
  v_tenant_id UUID := 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
  v_admin_id UUID;
  v_ventes_count INT;
BEGIN
  -- 1️⃣ Vérifier le tenant existe
  PERFORM 1 FROM tenants WHERE id = v_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found!', v_tenant_id;
  END IF;
  RAISE NOTICE 'Tenant OK: %', v_tenant_id;

  -- 2️⃣ Trouver l'employé Admin
  SELECT id INTO v_admin_id FROM employees
  WHERE tenant_id = v_tenant_id 
    AND first_name ILIKE 'Admin'
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Employee Admin not found in tenant!';
  END IF;
  RAISE NOTICE 'Admin employee found: %', v_admin_id;

  -- 3️⃣ Compter les ventes à migrer
  SELECT COUNT(*) INTO v_ventes_count FROM old_system.ventes;
  RAISE NOTICE 'Ventes to migrate: %', v_ventes_count;

  -- 4️⃣ MIGRATION: Insérer les ventes
  INSERT INTO transactions (
    id,
    tenant_id,
    product_id,
    quantity,
    subtotal,
    tax,
    discount_amount,
    total,
    payment_method,
    amount_received,
    change_amount,
    currency,
    cashier_id,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid()::uuid,                           -- id: Générer UUID
    v_tenant_id,                                       -- tenant_id
    v.product_id,                                      -- product_id
    v.quantite,                                        -- quantity
    (v.prix * v.quantite)::numeric(10,2),             -- subtotal = prix * quantité
    0::numeric(10,2),                                  -- tax = 0 (pas de taxe)
    v.discount::numeric(10,2),                         -- discount_amount
    ((v.prix * v.quantite) - v.discount::numeric)::numeric(10,2),  -- total = subtotal - discount
    v.payment_method,                                  -- payment_method (CASH, CARD, etc.)
    v.amount_received::numeric(10,2),                  -- amount_received
    (v.amount_received::numeric - ((v.prix * v.quantite) - v.discount::numeric))::numeric(10,2), -- change
    v.currency,                                        -- currency (USD/NIO)
    v_admin_id,                                        -- cashier_id = Admin
    v.date_vente AT TIME ZONE 'UTC',                  -- created_at
    NOW() AT TIME ZONE 'UTC'                           -- updated_at
  FROM old_system.ventes v
  WHERE v.product_id IS NOT NULL;  -- Ignorer les lignes sans product_id

  GET DIAGNOSTICS v_ventes_count = ROW_COUNT;
  RAISE NOTICE 'Successfully migrated % transactions', v_ventes_count;

END $$;

-- ============================================================================
-- VALIDATIONS POST-MIGRATION
-- ============================================================================

-- Vérifier les transactions créées
SELECT 
  COUNT(*) as total_transactions,
  SUM(subtotal) as total_subtotal,
  SUM(total) as total_amount,
  COUNT(DISTINCT currency) as currencies
FROM transactions
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
  AND cashier_id = (SELECT id FROM employees WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2' AND first_name ILIKE 'Admin' LIMIT 1);

-- Comparer avec l'ancien système
SELECT 
  COUNT(*) as old_ventes_count,
  SUM(prix * quantite) as old_subtotal,
  SUM(CAST(discount AS NUMERIC)) as old_discounts
FROM old_system.ventes;

COMMIT;
