# Résumé de la Migration des Transactions (Ventes)

## ✅ Transformation complétée

**Date:** 2025-04-29  
**Fichier source:** `ventes_rows.csv` (système legacy)  
**Fichier destination:** `transactions_import.csv` (Supabase Caja)  

### Statistiques de transformation

| Métrique | Valeur |
|----------|--------|
| **Lignes sources** | 12,243 |
| **Lignes transformées** | 12,243 |
| **Taux de succès** | 100% |
| **Période couverte** | 2025-04-29 à 2025-05-18 |
| **Devise principal** | CORDOBA |
| **Devise secondaire** | USD (quelques transactions) |

### Transformation des champs

| Champ source | Champ cible | Transformation | Notes |
|--------------|------------|-----------------|-------|
| `id` (INT) | `id` (TEXT/UUID) | UUID généré | Nouveau format Supabase |
| N/A | `tenant_id` (UUID) | Constant | `c1d44fe1-a862-4b6b-afbd-8566f61099a2` (Choco Rico) |
| `vendeur` (TEXT) | `cashier_id` (TEXT) | Constant | `1a8a598b-a417-4dca-9e45-89eff3b32a73` (Michel) |
| `product_id`, `nom_produit`, `quantite`, `prix`, `categorie` | `items` (JSONB) | Array JSON | `[{product_id, name, quantity, price, category}]` |
| `prix * quantite` | `subtotal` | Calcul | Avant remise |
| N/A | `tax` | Constant | 0.0 (pas de TVA) |
| `subtotal - discount` | `total` | Calcul | Après remise |
| `payment_method` | `payment_method` | Direct | CASH ou CARD |
| N/A | `status` | Constant | COMPLETED |
| `date_vente` | `created_at` | Direct | ISO 8601 UTC+0 |
| N/A | `updated_at` | Constant | Date/heure d'import |
| `discount` | `discount` | Direct | Montant remise |
| N/A | `cashier_name` | Constant | "Michel Bourbeau" |
| `amount_received` | `amount_received` | Direct | Montant reçu du client |
| `amount_received - total` | `change` | Calcul | Monnaie rendue |
| `currency` | `currency_paid` | Direct | CORDOBA ou USD |

### Exemple de transformation

**Ligne source (ventes):**
```csv
id,product_id,nom_produit,categorie,prix,quantite,date_vente,vendeur,discount,payment_method,amount_received,currency
1,d3dc4368-0bb7-4e21-8435-b18ebe752f70,Leche 60% Organico,Chocolate,150,1,2025-04-29 10:02:54+00,Michel,50,CARD,760,CORDOBA
```

**Ligne destination (transactions):**
```csv
id,tenant_id,cashier_id,items,subtotal,tax,total,payment_method,status,created_at,updated_at,discount,cashier_name,amount_received,change,currency_paid
a6c8ca15-cba2-4755-941c-17609a177667,c1d44fe1-a862-4b6b-afbd-8566f61099a2,1a8a598b-a417-4dca-9e45-89eff3b32a73,"[{""price"":150,""quantity"":1,""product_id"":""d3dc4368-0bb7-4e21-8435-b18ebe752f70"",""name"":""Leche 60% Organico"",""category"":""Chocolate""}]",150.00,0.0,100.00,CARD,COMPLETED,2025-04-29 10:02:54+00,2026-04-26T17:28:46Z,50.00,Michel Bourbeau,760.00,660.00,CORDOBA
```

## 📁 Fichiers générés

### 1. **transactions_import.csv** ✅
- **Localisation:** `C:\Users\miche\Downloads\transactions_import.csv`
- **Taille:** ~2.5 MB (12,243 lignes + header)
- **Format:** UTF-8, 16 colonnes, délimiteur virgule
- **Prêt pour:** Import Supabase Table Editor

### 2. **IMPORT_TRANSACTIONS_GUIDE.md** ✅
- **Localisation:** `caja-clients/db/IMPORT_TRANSACTIONS_GUIDE.md`
- **Contenu:** 
  - Étapes d'import détaillées
  - Requêtes de validation post-import
  - Dépannage des erreurs courantes
  - Instructions de rollback

## 🚀 Prochaines étapes

### Phase 1: Import (à faire maintenant)
1. **Télécharger le fichier CSV**
   - Source: `C:\Users\miche\Downloads\transactions_import.csv`
   - Taille: ~2.5 MB

2. **Importer dans Supabase**
   - Ouvrir https://supabase.com/
   - Sélectionner projet Choco Rico
   - Table Editor → transactions
   - Clic "Import data" → Sélectionner CSV
   - Confirmer (prendra ~1-2 minutes)

3. **Valider l'import**
   - Exécuter les requêtes SQL du guide
   - Vérifier: 12,243 lignes importées
   - Vérifier: JSON items bien structuré
   - Vérifier: Totaux correspondent

### Phase 2: Autres tables (prochainement)
- [ ] **Heures → time_entries** (~500-1000 lignes estimé)
- [ ] **Payments → payroll_receipts** (dépend des heures)
- [ ] **Dépenses → expenses** (indépendant)

### Phase 3: Validation applicative
- [ ] Ouvrir caja-clients dashboard
- [ ] Vérifier transactions historiques visibles
- [ ] Vérifier totaux de ventes incluent l'historique
- [ ] Tester création nouvelle transaction
- [ ] Tester rapports avec données historiques

## 🔧 Scripts utilisés

### PowerShell - Transformation ventes → transactions

**Fichier:** `transform_to_transactions_fixed.ps1`

**Logique:**
```powershell
Pour chaque ligne ventes:
  1. Générer UUID pour id
  2. Mapper tenant_id constant
  3. Mapper cashier_id constant
  4. Créer items JSON array
  5. Calculer subtotal (prix × quantité)
  6. Calculer total (subtotal - discount)
  7. Calculer change (amount_received - total)
  8. Mapper timestamp en ISO 8601
  9. Exporter en CSV
```

## 📊 Données statistiques

```sql
-- Après import, vérifier:

-- Nombre total de transactions
SELECT COUNT(*) FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
-- ✓ Attendu: 12,243

-- Montant total des ventes
SELECT SUM(total) as total_ventes,
       SUM(discount) as total_remises,
       SUM(amount_received) as total_recu
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Distribution CASH/CARD
SELECT payment_method, COUNT(*) 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY payment_method;

-- Distribution CORDOBA/USD
SELECT currency_paid, COUNT(*) 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY currency_paid;
```

## ⚠️ Points importants

1. **Schéma incompatible résolu** ✅
   - ❌ Ancien: Colonnes plates (product_id, quantity séparées)
   - ✅ Nouveau: items en JSONB array

2. **Format décimales corrigé** ✅
   - ❌ Ancien: 100,00 (virgule - problème locale Windows)
   - ✅ Nouveau: 100.00 (point - standard base de données)

3. **Status transactions défini** ✅
   - Toutes les transactions historiques = "COMPLETED"
   - Laisse la colonne `status` libre pour futures transactions en cours

4. **Tenant isolé correctement** ✅
   - Toutes les transactions assignées à: c1d44fe1-a862-4b6b-afbd-8566f61099a2 (Choco Rico)
   - Isolation garantie par RLS Supabase

5. **UUID générés pour chaque transaction** ✅
   - Format TEXT conforme à Supabase
   - Permet jointure avec d'autres tables si besoin

## 📝 Notes techniques

### Pourquoi JSONB pour items?
- **Flexibilité:** Peut contenir 1 ou N items par transaction
- **Queryable:** SQL peut accéder aux champs JSON (`items->0->>'product_id'`)
- **Performance:** Indexable si besoin
- **Structure:** Permet ajouter champs sans migration de schéma

### Pourquoi cashier_id = Admin toujours?
- **Données legacy:** Vendeurs n'existaient pas comme employees en système nouveau
- **Audit:** À améliorer - créer employees pour Rosita, Cony, Maria
- **Sécurité:** À vérifier - Michel peut voir toutes les transactions de son tenant

### Pourquoi status = COMPLETED?
- **Historique:** Les ventes passées sont définitivement complétées
- **Distinction:** Permet différencier des transactions en cours (status = PENDING)
- **Rapports:** Filtre facile: `WHERE status = 'COMPLETED'`

## 🎯 Succès criterium

Import considéré réussi si:
1. ✓ 12,243 lignes importées sans erreur
2. ✓ Aucune ligne dupliquée (vérifier `COUNT(*) = 12,243`)
3. ✓ JSON items valide et queryable
4. ✓ Montants totaux cohérents avec source
5. ✓ Dates correctives entre 2025-04-29 et 2025-05-18
6. ✓ Dashboard affiche les transactions historiques
7. ✓ Nouvelles transactions continuent de fonctionner normalement

---

**Créé:** 2025-04-29  
**Pour:** Migration Ventes (Legacy) → Transactions (Supabase Caja)  
**Contact:** Michel Bourbeau (Admin Choco Rico)
