# 📊 Guide Migration: Ancien Système → Caja-Clients

## 🗺️ Mapping des Tables

### 1. VENTES → transactions (POS)

| Ancien Système | Caja-Clients | Notes |
|----------------|--------------|-------|
| `id` | `id` | UUID généré |
| `product_id` | (join products) | Récupérer product_id |
| `nom_produit` | product.name | Via join |
| `categorie` | product.category | Via join |
| `prix` | `subtotal` | Prix * quantité |
| `quantite` | `quantity` | Total items |
| `date_vente` | `created_at` | Timestamp |
| `vendeur` | `cashier_id` | Référence employé |
| `discount` | `discount_amount` | En NIO |
| `currency` | `currency` | NIO/USD |
| `payment_method` | `payment_method` | CASH/CARD/TRANSFER |
| `amount_received` | `amount_received` | Pour vuelto |
| N/A | `tenant_id` | **REQUIS** - à définir |
| N/A | `tax` | Calculer si possible |
| N/A | `total` | prix + tax - discount |

**⚠️ ATTENTION:** Chaque transaction **DOIT avoir un `tenant_id`**!

---

### 2. HEURES TRAVAILLÉES (Heure) → time_entries

| Ancien Système | Caja-Clients | Notes |
|----------------|--------------|-------|
| `date` | `check_in` | Date + heure_debut |
| `heure_debut` | `check_in` | ISO format |
| `heure_fin` | `check_out` | ISO format ou NULL |
| `employe_id` | `employee_id` | Doit exister dans employees |
| N/A | `tenant_id` | **REQUIS** |
| N/A | `notes` | Laisser vide |
| N/A | `id` | UUID généré |

**Format ISO attendu:**
```typescript
check_in: "2026-04-26T08:30:00Z"
check_out: "2026-04-26T17:00:00Z"
```

---

### 3. SALAIRES PAYÉS (Payment) → payroll_receipts

| Ancien Système | Caja-Clients | Notes |
|----------------|--------------|-------|
| `id` | `id` | UUID généré |
| `employee_id` | `employee_id` | Doit exister |
| `total_pay` | `net_amount` | Montant net |
| `week_start` | `period_start` | Début période |
| `week_end` | `period_end` | Fin période |
| `paid_at` | `paid_at` | Date paiement |
| `total_hours` | `total_hours` | Heures travaillées |
| N/A | `tenant_id` | **REQUIS** |
| N/A | `gross_amount` | = total_pay + déductions |
| N/A | `deductions` | À calculer (avances, etc.) |
| N/A | `payroll_period_id` | UUID du period |

---

### 4. DÉPENSES (Expense) → expenses

| Ancien Système | Caja-Clients | Notes |
|----------------|--------------|-------|
| `id` | `id` | UUID généré |
| `date` | `created_at` | Timestamp |
| `description` | `description` | Texte |
| `amount` | `amount` | Montant NIO |
| `category` | `category` | Texte libre |
| N/A | `tenant_id` | **REQUIS** |
| N/A | `employee_id` | Optionnel (qui a enregistré) |
| N/A | `notes` | Champ libre |

**FixedExpense:** Créer une entrée `expenses` par occurrence (si recurrence=monthly, créer 12+ entrées)

---

## 🔄 Plan de Migration (Ordre Important!)

1. ✅ **Créer les employés** (employees) → sans ça les FK échouent
2. ✅ **Créer les produits** (products) → pour les ventes
3. ✅ **Migrer les heures** (time_entries) → indépendant
4. ✅ **Migrer les ventes** (transactions) → dépend des produits
5. ✅ **Migrer les salaires** (payroll_receipts) → après les heures
6. ✅ **Migrer les dépenses** (expenses) → indépendant

---

## ⚙️ Points Critiques

### Tenant ID
```
TOUS les enregistrements DOIVENT avoir le MÊME tenant_id:
Exemple: 'a2f2c061-fff1-4c6d-bb6b-e6eb473675ab'
```

### Employés
```sql
-- Vérifier que les employés existent AVANT migration:
SELECT id, first_name FROM employees 
WHERE tenant_id = 'votre-tenant-id';

-- Créer les employés manquants dans caja-clients
INSERT INTO employees (id, tenant_id, first_name, last_name, email, role_id, status)
VALUES (employee_uuid, tenant_id, 'Nom', 'Prenom', 'email', 'admin', 'ACTIVE');
```

### Produits
```sql
-- Vérifier les produits existent
SELECT id, name FROM products 
WHERE tenant_id = 'votre-tenant-id';
```

### Dates & Timezones
```
Ancien système: probablement dates locales (Nicaragua)
Caja-Clients: ISO 8601 UTC

Migration: Ajouter timezone Nicaragua (+UTC-6)
```

---

## 📝 Checklist Avant Migration

- [ ] Identifier le `tenant_id` cible
- [ ] Lister tous les employés (vérifier correspondances)
- [ ] Lister tous les produits (vérifier correspondances)
- [ ] Volume de données:
  - [ ] Nombre de ventes: ___
  - [ ] Nombre d'heures: ___
  - [ ] Nombre de paiements: ___
  - [ ] Nombre de dépenses: ___
- [ ] Backup complet des données anciennes
- [ ] Environnement test pour valider

---

---

## 🔍 Requêtes SQL pour Collecter les Infos

### A. NOUVEAU SYSTÈME (Caja-Clients - Supabase)

#### 1️⃣ Trouver le `tenant_id` cible
```sql
-- Lister tous les tenants
SELECT 
  id as tenant_id,
  company_name,
  country,
  created_at
FROM tenants
ORDER BY created_at DESC;
```
**→ Copie le UUID du tenant cible**

---

#### 2️⃣ Lister les employés existants
```sql
-- Vérifier quels employés existent déjà
SELECT 
  id,
  first_name,
  last_name,
  email,
  role_id,
  status,
  created_at
FROM employees
WHERE tenant_id = 'REMPLACER_PAR_TENANT_ID'
ORDER BY first_name;
```

---

#### 3️⃣ Lister les produits existants
```sql
-- Vérifier quels produits existent déjà
SELECT 
  id,
  name,
  category,
  price,
  quantity,
  min_stock,
  created_at
FROM products
WHERE tenant_id = 'REMPLACER_PAR_TENANT_ID'
ORDER BY name;
```

---

### B. ANCIEN SYSTÈME (Votre Base)

#### 4️⃣ Volume de ventes
```sql
-- Compter les ventes
SELECT 
  COUNT(*) as nombre_ventes,
  MIN(date_vente) as premiere_vente,
  MAX(date_vente) as derniere_vente
FROM ventes;

-- Exemple: 5 lignes
SELECT 
  id,
  product_id,
  nom_produit,
  prix,
  quantite,
  date_vente,
  vendeur,
  discount,
  payment_method
FROM ventes
LIMIT 5;
```

---

#### 5️⃣ Volume d'heures travaillées
```sql
-- Compter les heures
SELECT 
  COUNT(*) as nombre_heures,
  COUNT(DISTINCT employe_id) as nombre_employes,
  MIN(date) as premiere_entree,
  MAX(date) as derniere_entree
FROM heures;

-- Exemple: 5 lignes
SELECT 
  id,
  employe_id,
  date,
  heure_debut,
  heure_fin,
  (EXTRACT(EPOCH FROM (heure_fin - heure_debut)) / 3600)::numeric(5,2) as heures_travaillees
FROM heures
LIMIT 5;
```

---

#### 6️⃣ Volume de paiements/salaires
```sql
-- Compter les paiements
SELECT 
  COUNT(*) as nombre_paiements,
  COUNT(DISTINCT employee_id) as nombre_employes_payes,
  MIN(paid_at) as premier_paiement,
  MAX(paid_at) as dernier_paiement,
  SUM(total_pay) as total_verse
FROM payments;

-- Exemple: 5 lignes
SELECT 
  id,
  employee_id,
  total_pay,
  week_start,
  week_end,
  total_hours,
  paid_at
FROM payments
LIMIT 5;
```

---

#### 7️⃣ Volume de dépenses
```sql
-- Compter les dépenses
SELECT 
  COUNT(*) as nombre_depenses,
  MIN(date) as premiere_depense,
  MAX(date) as derniere_depense,
  SUM(amount) as total_depenses
FROM expenses;

-- Exemple: 5 lignes
SELECT 
  id,
  date,
  description,
  amount,
  category
FROM expenses
LIMIT 5;
```

---

#### 8️⃣ Bonus: Employés dans l'ancien système
```sql
-- Lister tous les employés
SELECT 
  id,
  first_name,
  last_name,
  email,
  created_at
FROM employees
ORDER BY first_name;
```

---

#### 9️⃣ Bonus: Produits dans l'ancien système
```sql
-- Lister tous les produits
SELECT 
  id,
  name,
  category,
  price,
  created_at
FROM products
ORDER BY name;
```

---

## 📋 Script de Collecte Rapide (Copier-Coller)

**Pour l'ANCIEN système, exécute tout d'un coup:**

```sql
-- ========== ANCIEN SYSTÈME ==========
-- VENTES
SELECT COUNT(*) as ventes_total FROM ventes;
SELECT * FROM ventes LIMIT 5;

-- HEURES
SELECT COUNT(*) as heures_total FROM heures;
SELECT * FROM heures LIMIT 5;

-- PAIEMENTS
SELECT COUNT(*) as paiements_total FROM payments;
SELECT * FROM payments LIMIT 5;

-- DÉPENSES
SELECT COUNT(*) as depenses_total FROM expenses;
SELECT * FROM expenses LIMIT 5;

-- EMPLOYÉS
SELECT COUNT(*) as employes_total FROM employees;
SELECT * FROM employees LIMIT 5;

-- PRODUITS
SELECT COUNT(*) as produits_total FROM products;
SELECT * FROM products LIMIT 5;
```

---

**Pour le NOUVEAU système (Supabase), remplace `'REMPLACER_PAR_TENANT_ID'` par l'UUID:**

```sql
-- ========== NOUVEAU SYSTÈME (Supabase) ==========
-- Trouver tenant_id
SELECT id, company_name FROM tenants LIMIT 10;

-- Remplacer UUID ci-dessous:
SELECT COUNT(*) as employes_total FROM employees WHERE tenant_id = 'a2f2c061-fff1-4c6d-bb6b-e6eb473675ab';
SELECT * FROM employees WHERE tenant_id = 'a2f2c061-fff1-4c6d-bb6b-e6eb473675ab' LIMIT 5;

SELECT COUNT(*) as produits_total FROM products WHERE tenant_id = 'a2f2c061-fff1-4c6d-bb6b-e6eb473675ab';
SELECT * FROM products WHERE tenant_id = 'a2f2c061-fff1-4c6d-bb6b-e6eb473675ab' LIMIT 5;
```

---

## 🚀 Prochaine Étape

**Envoie-moi les résultats de ces requêtes:**
1. ✅ UUID du `tenant_id` cible
2. ✅ Nombre total: ventes, heures, paiements, dépenses
3. ✅ 5 lignes d'exemple de chaque table
4. ✅ Liste des employés + produits (ancien système)

Je te crée le **script de migration complet** avec validation! 💪
