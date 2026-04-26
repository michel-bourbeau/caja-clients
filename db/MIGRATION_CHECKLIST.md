# ✅ Checklist d'Import - Transactions Historiques

## 📋 Avant de commencer

- [ ] Backuper la base de données Supabase (option dans Supabase console)
- [ ] Vérifier la connexion Internet
- [ ] Prévoir 10-15 minutes pour l'import
- [ ] Avoir accès admin à https://supabase.com/
- [ ] Télécharger le fichier `transactions_import.csv` depuis Downloads

## 🔍 Vérifications du fichier CSV

**Fichier:** `C:\Users\miche\Downloads\transactions_import.csv`

- [ ] Fichier existe et taille est ~2.5 MB
- [ ] Fichier n'est pas verrouillé (ne pas ouvrir dans Excel pendant l'import)
- [ ] Nombre de colonnes: 16 (vérifier header)
- [ ] Nombre de lignes: 12,244 (1 header + 12,243 données)

**Commande pour vérifier:**
```powershell
$file = 'C:\Users\miche\Downloads\transactions_import.csv'
$lines = @(Get-Content $file).Count
$header = (Get-Content $file -First 1).Split(',').Count
Write-Host "Fichier: $file"
Write-Host "Lignes totales: $lines"
Write-Host "Colonnes: $header"
```

## 🚀 Étapes d'import

### Étape 1: Ouvrir Supabase
```
[ ] Aller à https://supabase.com/
[ ] Login avec vos identifiants
[ ] Sélectionner projet "Choco Rico"
[ ] Attendre chargement du dashboard
```

### Étape 2: Naviguer vers la table transactions
```
[ ] Cliquer "SQL Editor" dans le menu gauche
[ ] Exécuter cette requête pour vérifier la structure:

    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    ORDER BY ordinal_position;

[ ] Vérifier que la requête retourne 16 colonnes
[ ] Vérifier: column "items" a data_type "jsonb"
```

### Étape 3: Importer le CSV
```
[ ] Cliquer "Table Editor" dans le menu gauche
[ ] Chercher et cliquer la table "transactions"
[ ] Cliquer le bouton "↓ Import data" (ou menu ⋮)
[ ] Sélectionner "transactions_import.csv"
[ ] Review la preview des données:
    - Vérifier que 12,243 lignes apparaissent
    - Vérifier que les champs sont bien mappés
    - Vérifier que items contient le JSON
[ ] Cliquer "Import" (à côté du nombre de lignes)
[ ] Attendre le message "✓ Import completed successfully"
```

### Étape 4: Valider l'import
Exécuter ces requêtes dans SQL Editor:

#### Requête 1: Compter les lignes
```sql
SELECT COUNT(*) as total_transactions 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
```
**Attendu:** 12,243

- [ ] Résultat = 12,243 ✓

#### Requête 2: Vérifier les devises
```sql
SELECT currency_paid, COUNT(*) as count 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY currency_paid
ORDER BY count DESC;
```
**Attendu:** CORDOBA (majorité), USD (quelques)

- [ ] CORDOBA avec un nombre élevé ✓
- [ ] USD avec nombre plus bas (ou 0) ✓

#### Requête 3: Vérifier les méthodes de paiement
```sql
SELECT payment_method, COUNT(*) as count
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
GROUP BY payment_method
ORDER BY count DESC;
```
**Attendu:** CASH et CARD

- [ ] CASH avec nombre ✓
- [ ] CARD avec nombre ✓
- [ ] Pas d'autres valeurs ✓

#### Requête 4: Vérifier les montants
```sql
SELECT 
  COUNT(*) as count,
  ROUND(SUM(total)::numeric, 2) as total_montant,
  ROUND(SUM(discount)::numeric, 2) as total_remises,
  ROUND(SUM(amount_received)::numeric, 2) as total_recu
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
```
**Attendu:** Montants positifs, cohérents

- [ ] count = 12,243 ✓
- [ ] total_montant > 0 ✓
- [ ] total_remises >= 0 ✓
- [ ] total_recu > total_montant ✓

#### Requête 5: Vérifier la structure JSON
```sql
SELECT 
  id,
  items,
  items->0->>'product_id' as product_id,
  items->0->>'name' as product_name,
  items->0->>'quantity' as quantity,
  items->0->>'price' as price
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
LIMIT 5;
```
**Attendu:** 5 lignes avec JSON bien structuré

- [ ] 5 lignes retournées ✓
- [ ] product_id est un UUID ✓
- [ ] product_name est du texte ✓
- [ ] quantity est un nombre ✓
- [ ] price est un nombre ✓

#### Requête 6: Vérifier les dates
```sql
SELECT 
  MIN(DATE(created_at)) as premiere_date,
  MAX(DATE(created_at)) as derniere_date,
  COUNT(DISTINCT DATE(created_at)) as nombre_de_jours
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';
```
**Attendu:** Entre 2025-04-29 et 2025-05-18

- [ ] première_date ≈ 2025-04-29 ✓
- [ ] dernière_date ≈ 2025-05-18 ✓
- [ ] nombre_de_jours > 10 ✓

## 🎯 Après l'import

### Vérifier dans l'application

```
[ ] Ouvrir https://caja-clients.vercel.app/
[ ] Login comme Michel (Admin)
[ ] Aller à Dashboard → Ventas (ou Sales)
[ ] Vérifier que les transactions historiques apparaissent
[ ] Vérifier que les montants totaux sont corrects
[ ] Cliquer sur une transaction pour voir les détails
[ ] Vérifier que l'item JSON s'affiche correctement
```

### Tester les fonctionnalités

```
[ ] Créer une nouvelle transaction de test
[ ] Vérifier qu'elle s'ajoute à la liste
[ ] Filtrer par date → vérifier les transactions anciennes apparaissent
[ ] Vérifier les rapports incluent l'historique
[ ] Tester export de données
```

## ⚠️ En cas de problème

### L'import échoue avec "Data incompatible"
```
[ ] Vérifier que le CSV n'est pas ouvert dans Excel
[ ] Vérifier que le CSV est bien en UTF-8
[ ] Vérifier que le nombre de colonnes = 16
[ ] Vérifier que la table transactions existe
[ ] Relancer l'import depuis le début
```

### Montants ne correspondent pas
```
[ ] Comparer le résultat de Requête 4 avec les données source
[ ] Vérifier que les calculs sont corrects
[ ] Peut-être que certaines lignes source ont des données mal formatées
```

### JSON items est vide ou mal formaté
```
[ ] Vérifier Requête 5 - elle doit retourner des données
[ ] Si vide, c'est que le CSV n'a pas importé correctement
[ ] Supprimer les lignes importées et réessayer
```

### Nouvelle transaction crée mais n'apparaît pas
```
[ ] Recharger la page (F5)
[ ] Vérifier que la transaction est associée au bon tenant
[ ] Vérifier les permissions de l'utilisateur actif
```

## 🔄 Rollback (en cas d'erreur majeure)

Si l'import a échoué ou contient beaucoup d'erreurs:

```sql
-- Étape 1: Compter les transactions importées
SELECT COUNT(*) 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
AND created_at >= '2025-04-29';

-- Étape 2: ATTENTION - Supprimer SEULEMENT les transactions importées
DELETE FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2'
AND created_at >= '2025-04-29'
AND created_at < '2025-05-19';

-- Étape 3: Vérifier qu'on a supprimé
SELECT COUNT(*) 
FROM transactions 
WHERE tenant_id = 'c1d44fe1-a862-4b6b-afbd-8566f61099a2';

-- Étape 4: Corriger le CSV et réessayer l'import
```

## ✅ Succès confirmé quand:

- [ ] Requête 1: 12,243 lignes importées
- [ ] Requête 2: Devises cohérentes (CORDOBA majorité)
- [ ] Requête 3: Paiements cohérents (CASH + CARD)
- [ ] Requête 4: Montants positifs et logiques
- [ ] Requête 5: JSON structure correcte
- [ ] Requête 6: Dates dans la bonne plage
- [ ] Application affiche les données
- [ ] Nouvelles transactions continuent de fonctionner

## 📞 Fichiers de support

| Fichier | Localisation | But |
|---------|-------------|-----|
| `transactions_import.csv` | `C:\Users\miche\Downloads\` | Le fichier CSV à importer |
| `IMPORT_TRANSACTIONS_GUIDE.md` | `caja-clients/db/` | Guide détaillé |
| `MIGRATION_VENTES_SUMMARY.md` | `caja-clients/db/` | Résumé technique |
| `MIGRATION_CHECKLIST.md` | `caja-clients/db/` | Cette checklist |

## 🎯 Temps estimé

- Vérifications avant: 2-3 minutes
- Import: 2-5 minutes (dépend de la connexion)
- Validation: 5-10 minutes
- Test applicatif: 5 minutes
- **Total: 15-25 minutes**

---

**Version:** 1.0  
**Date:** 2025-04-29  
**Tenant:** Choco Rico (c1d44fe1-a862-4b6b-afbd-8566f61099a2)  
**Nombre de transactions:** 12,243
