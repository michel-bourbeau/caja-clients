# 🚀 Migration des Ventes: Supabase → Supabase

## 📋 Avant de lancer la migration

### ✅ Prérequis:
1. **Deux connexions Supabase actives:**
   - Ancienne base (avec les données `ventes`)
   - Nouvelle base (caja-clients)

2. **Les employés et produits doivent exister** dans la nouvelle base:
   ```sql
   -- Vérifier
   SELECT COUNT(*) FROM employees WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
   SELECT COUNT(*) FROM products WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
   ```

3. **Backup de l'ancienne base** (optionnel mais recommandé)

---

## 🔧 Étapes d'exécution

### Étape 1: Préparer l'accès aux deux bases

**Depuis Supabase Console (ancienne base):**
1. SQL Editor → New Query
2. Copie le script ci-dessous pour créer l'accès:

```sql
-- Dans l'ANCIENNE base Supabase
-- Vérifier la table ventes existe
SELECT * FROM ventes LIMIT 1;

-- Vérifier le nombre total
SELECT COUNT(*) as total FROM ventes;
```

**Résultat attendu:** Tu dois voir tes données ventes

---

### Étape 2: Exécuter la migration

**Option A: Via Supabase Console (NOUVELLE base)**

1. Ouvre [Supabase Console](https://supabase.com/dashboard)
2. Sélectionne le projet **caja-clients**
3. Va à **SQL Editor** → **New Query**
4. **Copie tout le contenu** de `001_migrate_ventes_from_legacy.sql`
5. **Remplace** cette ligne:
   ```sql
   SELECT ... FROM old_system.ventes v
   ```
   Par une requête qui récupère les données de l'ancienne base

---

### Étape 3: Alternative - Migration via PostgreSQL (Plus simple!)

Si tu as accès aux deux URLs Supabase directement:

```bash
# Terminal: Migrer directement de l'ancienne vers la nouvelle base
psql -h ANCIENNE_DB_HOST -U postgres -d postgres -c \
"INSERT INTO new_db.public.transactions SELECT * FROM old_db.public.ventes;"
```

---

## 📊 Validation post-migration

**Après exécution, lance ces vérifications:**

### Dans la NOUVELLE base:
```sql
-- Vérifier les transactions importées
SELECT COUNT(*) as total_transactions
FROM transactions
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Vérifier les montants
SELECT 
  MIN(total) as montant_min,
  MAX(total) as montant_max,
  AVG(total) as montant_moyen,
  SUM(total) as total_vendu
FROM transactions
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Vérifier les currencies
SELECT currency, COUNT(*) 
FROM transactions
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY currency;

-- Vérifier les payment_methods
SELECT payment_method, COUNT(*) 
FROM transactions
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY payment_method;
```

---

## ⚠️ Troubleshooting

### ❌ Erreur: "Tenant not found"
```sql
-- Vérifier le tenant existe
SELECT id, name FROM tenants WHERE id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
```

### ❌ Erreur: "Employee Admin not found"
```sql
-- Trouver l'employé correct
SELECT id, first_name, last_name 
FROM employees 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Si pas d'Admin, créer:
INSERT INTO employees (id, tenant_id, first_name, last_name, email, status, created_at)
VALUES (gen_random_uuid(), 'c1d44fe1-a862-4b6b-afbd-8566f61099a2', 'Admin', 'System', 'admin@chocolrico.com', 'ACTIVE', NOW());
```

### ❌ Erreur: "product_id not found"
```sql
-- Les produits doivent exister dans la nouvelle base
SELECT id, name FROM products 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Si produits manquants, faut d'abord migrer les produits
```

---

## 🔄 Prochaines étapes

**Après ventes, on peut migrer:**
1. `heures` → `time_entries`
2. `payments` → `payroll_receipts`
3. `expenses` → `expenses`

Dis-moi quand tu as exécuté la migration et les résultats! 🚀
