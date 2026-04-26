-- ============================================================================
-- 🧪 SCRIPTS DE TEST - SUSPENSION DE PAIEMENT
-- ============================================================================
-- Exécuter dans Supabase SQL Editor

-- ============================================================================
-- ÉTAPE 1 : Créer/Récupérer un Tenant de Test
-- ============================================================================

-- Voir tous les tenants de test
SELECT id, name, plan, paid_until, features 
FROM tenants 
WHERE name LIKE 'Test%' OR name LIKE 'test%'
ORDER BY created_at DESC;

-- Ou créer un nouveau tenant de test
-- INSERT INTO tenants (name, plan, paid_until, email, directory_name, country)
-- VALUES ('Test Suspension', 'professional', NOW() + INTERVAL '30 days', 'test@example.com', 'test-susp', 'CA')
-- RETURNING id, name;


-- ============================================================================
-- ÉTAPE 2 : Forcer une Expiration dans le Passé (>3 jours)
-- ============================================================================

-- ⚠️ MODIFIER 'YOUR_TENANT_ID' AVEC LE VRAI ID
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE tenants
SET paid_until = NOW() - INTERVAL '4 days'  -- Expiré depuis 4 jours
WHERE id = (SELECT id FROM tenant_data)
RETURNING id, name, paid_until, features;


-- ============================================================================
-- ÉTAPE 3 : Vérifier l'État du Tenant AVANT Suspension
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  t.id,
  t.name,
  t.plan,
  t.paid_until,
  CASE 
    WHEN t.paid_until < NOW() - INTERVAL '3 days' THEN '🔴 Devrait être suspendu'
    WHEN t.paid_until < NOW() THEN '⚠️ Expiré mais pas suspendu'
    WHEN t.paid_until < NOW() + INTERVAL '7 days' THEN '🟡 Expire bientôt'
    ELSE '✅ Actif'
  END as payment_status,
  t.features ->> 'pos' as pos_enabled,
  t.features ->> 'inventory' as inventory_enabled,
  t.features ->> 'employees' as employees_enabled
FROM tenants t
WHERE t.id = (SELECT id FROM tenant_data);


-- ============================================================================
-- ÉTAPE 4 : Vérifier les Utilisateurs du Tenant
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  u.id,
  u.email,
  u.role_id,
  u.status,
  CASE 
    WHEN u.role_id = 'admin' THEN '👑 Admin (devrait rester ACTIVE)'
    ELSE '👤 Utilisateur normal'
  END as user_type
FROM users u
WHERE u.tenant_id = (SELECT id FROM tenant_data)
ORDER BY u.role_id DESC, u.email;


-- ============================================================================
-- ÉTAPE 5 : Vérifier les Employés du Tenant
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.status,
  CASE 
    WHEN e.status = 'INACTIVE' THEN '🔴 Inactif'
    ELSE '✅ Actif'
  END as employee_status
FROM employees e
WHERE e.tenant_id = (SELECT id FROM tenant_data);


-- ============================================================================
-- ÉTAPE 6 : SIMULER LA SUSPENSION (après cron job)
-- ============================================================================

-- Désactiver les modules
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE tenants
SET features = jsonb_build_object(
  'pos', false,
  'inventory', false,
  'employees', false,
  'schedules', false,
  'payroll', false,
  'reports', false,
  'loyalty', false,
  'expenses', false,
  'taxes', false,
  'contacts', false,
  'customRoles', false,
  'api', false
)
WHERE id = (SELECT id FROM tenant_data)
RETURNING id, name, features;

-- Désactiver les utilisateurs non-admin
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE users
SET status = 'INACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data)
  AND role_id != 'admin'  -- Garder les admins
RETURNING id, email, role_id, status;

-- Désactiver les employés
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE employees
SET status = 'INACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data)
RETURNING id, first_name, last_name, status;


-- ============================================================================
-- ÉTAPE 7 : Vérifier que la Suspension est Appliquée
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  '📊 TENANT STATUS' as section,
  t.id,
  t.name,
  CASE 
    WHEN t.features ->> 'pos' = 'false' THEN '🔴 SUSPENDU'
    ELSE '✅ Actif'
  END as suspension_status,
  (t.features ->> 'pos')::boolean as pos_enabled,
  (t.features ->> 'inventory')::boolean as inventory_enabled
FROM tenants t
WHERE t.id = (SELECT id FROM tenant_data);

-- Vérifier les utilisateurs
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  '👥 USERS' as section,
  u.email,
  u.role_id,
  u.status,
  CASE 
    WHEN u.role_id = 'admin' AND u.status = 'ACTIVE' THEN '✅ Correct (admin actif)'
    WHEN u.role_id != 'admin' AND u.status = 'INACTIVE' THEN '✅ Correct (user inactif)'
    ELSE '❌ ERREUR'
  END as check
FROM users u
WHERE u.tenant_id = (SELECT id FROM tenant_data)
ORDER BY u.role_id DESC;


-- ============================================================================
-- ÉTAPE 8 : RÉACTIVATION (après paiement)
-- ============================================================================

-- Réactiver les modules (plan = professional)
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE tenants
SET 
  paid_until = NOW() + INTERVAL '30 days',
  features = jsonb_build_object(
    'pos', true,
    'inventory', true,
    'employees', true,
    'schedules', true,
    'payroll', false,
    'reports', true,
    'loyalty', false,
    'expenses', false,
    'taxes', true,
    'contacts', false,
    'customRoles', false,
    'api', false
  )
WHERE id = (SELECT id FROM tenant_data)
RETURNING id, name, paid_until, features;

-- Réactiver les utilisateurs
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE users
SET status = 'ACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data)
  AND status = 'INACTIVE'
RETURNING id, email, role_id, status;

-- Réactiver les employés
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE employees
SET status = 'ACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data)
  AND status = 'INACTIVE'
RETURNING id, first_name, last_name, status;


-- ============================================================================
-- ÉTAPE 9 : Vérifier que la Réactivation est Complète
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  '📊 POST-RÉACTIVATION' as section,
  t.name,
  CASE 
    WHEN t.features ->> 'pos' = 'true' THEN '✅ RÉACTIVÉ'
    ELSE '❌ Pas réactivé'
  END as status,
  t.features ->> 'pos' as pos,
  t.features ->> 'inventory' as inventory,
  t.features ->> 'employees' as employees
FROM tenants t
WHERE t.id = (SELECT id FROM tenant_data);


-- ============================================================================
-- SCÉNARIO COMPLET : ALERTE 7 JOURS AVANT
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
UPDATE tenants
SET paid_until = NOW() + INTERVAL '7 days'
WHERE id = (SELECT id FROM tenant_data)
RETURNING id, name, paid_until, features;

-- Vérifier
SELECT 
  name,
  paid_until,
  EXTRACT(DAY FROM paid_until - NOW()) as days_remaining,
  CASE 
    WHEN EXTRACT(DAY FROM paid_until - NOW()) <= 7 THEN '🟡 Alerte 7 jours'
    WHEN EXTRACT(DAY FROM paid_until - NOW()) <= 3 THEN '🔴 Alerte 3 jours'
    ELSE '✅ OK'
  END as alert_status
FROM tenants
WHERE name = 'Test Suspension';


-- ============================================================================
-- HISTORIQUE DES PAIEMENTS
-- ============================================================================

WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
SELECT 
  ph.id,
  ph.payment_date,
  ph.amount,
  ph.valid_until,
  ph.payment_method,
  ph.notes
FROM payment_history ph
WHERE ph.tenant_id = (SELECT id FROM tenant_data)
ORDER BY ph.payment_date DESC;


-- ============================================================================
-- RESET COMPLET (en cas d'erreur de test)
-- ============================================================================

-- ⚠️ ATTENTION : À utiliser UNIQUEMENT pour nettoyer après les tests !

-- Réactiver tout le tenant
WITH tenant_data AS (
  SELECT id FROM tenants WHERE name = 'Test Suspension' LIMIT 1
)
BEGIN;

UPDATE tenants
SET 
  paid_until = NOW() + INTERVAL '30 days',
  features = jsonb_build_object(
    'pos', true,
    'inventory', true,
    'employees', true,
    'schedules', true,
    'payroll', false,
    'reports', true,
    'loyalty', false,
    'expenses', false,
    'taxes', true,
    'contacts', false,
    'customRoles', false,
    'api', false
  )
WHERE id = (SELECT id FROM tenant_data);

UPDATE users
SET status = 'ACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data);

UPDATE employees
SET status = 'ACTIVE'
WHERE tenant_id = (SELECT id FROM tenant_data);

COMMIT;

-- Vérifier
SELECT 'Reset complet ✅' as message;
