# Guide d'Import des Transactions Historiques (Supabase)

## 📋 Vue d'ensemble

Ce guide explique comment importer les 12,243 transactions historiques du système Ventes dans la table `transactions` de Supabase.

## 🔑 Fichier à utiliser

**Fichier:** `transactions_import.csv`  
**Localisation:** `C:\Users\miche\Downloads\transactions_import.csv`  
**Lignes:** 12,243 transactions  
**Période:** 2025-04-29 à 2025-05-18  
**Devise:** CORDOBA (majorité) et USD (quelques transactions)  

## 📊 Structure du fichier CSV

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT (UUID) | Identifiant unique généré automatiquement |
| `tenant_id` | UUID | Toujours `c1d44fe1-a862-4b6b-afbd-8566f61099a2` (Choco Rico) |
| `cashier_id` | TEXT | `1a8a598b-a417-4dca-9e45-89eff3b32a73` (Michel Bourbeau, Admin) |
| `items` | JSONB | Array: `[{product_id, name, quantity, price, category}]` |
| `subtotal` | numeric | Montant avant remise |
| `tax` | numeric | Toujours 0.0 (pas de TVA enregistrée) |
| `total` | numeric | Montant après remise |
| `payment_method` | TEXT | "CASH" ou "CARD" |
| `status` | TEXT | "COMPLETED" (historique) |
| `created_at` | timestamp | Date de la vente (ISO 8601 UTC+0) |
| `updated_at` | timestamp | Date d'import (ISO 8601 UTC+0) |
| `discount` | numeric | Montant remise (0.00 ou valeur positive) |
| `cashier_name` | TEXT | "Michel Bourbeau" |
| `amount_received` | numeric | Montant reçu du client |
| `change` | numeric | Monnaie rendue |
| `currency_paid` | TEXT | "CORDOBA" ou "USD" |

## 🚀 Étapes d'import (Supabase Console)

### 1. Accéder à Supabase
```
1. Ouvrir https://supabase.com/
2. Login avec vos credentials
3. Sélectionner le projet Choco Rico
4. Aller à l'onglet "SQL Editor"
```

### 2. Vérifier les prérequis
Avant d'importer, exécuter cette requête pour confirmer:
```sql
-- Vérifier que la table transactions existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Devrait retourner 16 colonnes:
-- id (text), tenant_id (uuid), cashier_id (text), items (jsonb), 
-- subtotal (numeric), tax (numeric), total (numeric), 
-- payment_method (text), status (text), created_at, updated_at, 
-- discount (numeric), cashier_name (text), amount_received (numeric),
-- change (numeric), currency_paid (text)
```

### 3. Télécharger le fichier CSV

**Option A: Via Supabase Console UI (recommandé)**
```
1. Ouvrir l'onglet "Table Editor"
2. Cliquer sur la table "transactions"
3. Cliquer le bouton "Import data" (ou ⋮ menu)
4. Sélectionner "transactions_import.csv"
5. Vérifier la preview des données
6. Confirmer l'import
```

**Option B: Via SQL (si Option A ne fonctionne pas)**

D'abord, charger le CSV dans une table temp:
```sql
-- Créer une table temporaire pour le CSV
CREATE TEMP TABLE import_transactions AS
SELECT * FROM transactions WHERE 1=0;

-- Importer via l'interface UI Supabase
-- (Le SQL ne peut pas charger de fichiers directement)
```

### 4. Validation post-import

Après l'import, exécuter ces requêtes de validation:

```sql
-- Vérifier le nombre de lignes importées
SELECT COUNT(*) as total_transactions 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
-- Expected: 12243

-- Vérifier la distribution par devise
SELECT currency_paid, COUNT(*) as count 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY currency_paid;
-- Expected: CORDOBA (majorité), USD (quelques)

-- Vérifier les montants totaux
SELECT 
  COUNT(*) as count,
  SUM(total) as total_amount,
  SUM(discount) as total_discounts,
  SUM(amount_received) as total_received
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Vérifier les méthodes de paiement
SELECT payment_method, COUNT(*) as count
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY payment_method;
-- Expected: CASH, CARD

-- Vérifier la structure du JSON items
SELECT 
  id,
  items,
  items->0->>'product_id' as first_product_id,
  items->0->>'name' as first_product_name
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
LIMIT 5;

-- Vérifier la plage de dates
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at);
```

## ⚠️ Problèmes courants

### "Data incompatible" error
**Cause:** Le format du CSV ne correspond pas au schéma de la table  
**Solution:** 
- Vérifier que les UUIDs sont bien formatés (regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
- Vérifier que le JSON items est bien formaté (sans virgules à la fin des nombres: `150.00` pas `150,00`)
- Vérifier les noms de colonnes correspondent exactement

### "Column mismatch"
**Cause:** Le nombre de colonnes dans le CSV ne correspond pas à la table  
**Solution:** 
- Le CSV doit avoir exactement 16 colonnes
- Vérifier l'ordre: id, tenant_id, cashier_id, items, subtotal, tax, total, payment_method, status, created_at, updated_at, discount, cashier_name, amount_received, change, currency_paid

### "Invalid JSON in items column"
**Cause:** Le format JSON n'est pas valide  
**Solution:** 
- Chaque cell `items` doit être: `[{...}]` (array avec un objet)
- Les doubles quotes doivent être échappées: `""` dans le CSV
- Format: `[{"product_id":"uuid","name":"text","quantity":number,"price":number,"category":"text"}]`

## 📈 Après l'import

### 1. Vérifier la dashboard
```
1. Ouvrir l'application caja-clients
2. Naviguer vers Dashboard → Ventas
3. Vérifier que les transactions historiques apparaissent
4. Vérifier les montants totaux correspondent aux requêtes de validation
```

### 2. Tester les fonctionnalités
```
- Vendre un nouveau produit → vérifier qu'il s'ajoute à la liste
- Filtrer par date → vérifier que les transactions historiques apparaissent
- Générer un rapport → vérifier que les totaux incluent l'historique
```

### 3. Nettoyer
```
- Supprimer le fichier transactions_import.csv après confirmation d'import
- Archiver un backup du CSV pour la trace
```

## 🔄 Rollback en cas de problème

Si l'import a échoué ou contient des données incorrectes:

```sql
-- Voir les transactions importées dans la plage de dates
SELECT COUNT(*), MIN(created_at), MAX(created_at)
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
AND created_at >= '2025-04-29';

-- Supprimer SEULEMENT les transactions importées (par date)
DELETE FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
AND created_at >= '2025-04-29'
AND created_at < '2025-05-19';

-- Vérifier qu'on a bien supprimé
SELECT COUNT(*) FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
```

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifier d'abord la section "Problèmes courants" ci-dessus
2. Exécuter les requêtes de validation pour identifier le problème
3. Vérifier les logs de Supabase (onglet "Logs")
4. Contacter le support Supabase avec le message d'erreur exact

---

**Créé:** 2025-04-29  
**Fichier source:** `C:\Users\miche\Downloads\transactions_import.csv`  
**Nombre de transactions:** 12,243  
**Tenant ID:** c1d44fe1-a862-4b6b-afbd-8566f61099a2 (Choco Rico)
