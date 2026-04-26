# 🧪 Plan de Test - Suspension de Paiement

## Vue d'ensemble

Ce guide teste la suspension automatique et la réactivation des comptes tenant.

---

## 📋 Prérequis

- Next.js en local : `npm run dev`
- Accès à Supabase dashboard
- Postman ou `curl` pour tester les APIs
- 2-3 tenants de test

---

## 🎯 Scénario 1 : Suspension Automatique (>3 jours expiré)

### Étape 1 : Créer un Tenant de Test

**Via SuperAdmin Dashboard :**
1. Aller à `/superadmin/login` → Mot de passe
2. Aller à **Tenants** → **Créer Tenant**
3. Remplir le formulaire :
   - **Nom** : "Test Suspension 1"
   - **Plan** : professional
   - **Email** : test1@example.com
   - **Répertoire** : test1
   - **Pays** : CA
4. Cliquer **Créer**

**Note le Tenant ID** (ex: `abc123...`)

---

### Étape 2 : Forcer une Expiration Passée

**Via Supabase SQL Editor :**

```sql
UPDATE tenants
SET paid_until = NOW() - INTERVAL '4 days'  -- Expiré depuis 4 jours
WHERE id = 'abc123...';

-- Vérifier
SELECT id, name, paid_until, features 
FROM tenants 
WHERE id = 'abc123...';
```

**Résultat attendu :**
```
paid_until: 2026-04-22 (passé)
features: {pos: true, inventory: true, ...} (pas encore suspendu)
```

---

### Étape 3 : Exécuter le Cron Job de Vérification

**Option A : Appel API Direct**
```bash
curl -X POST http://localhost:3000/api/superadmin/payment/check-expirations
```

**Résultat attendu :**
```json
{
  "message": "Payment expiration check completed",
  "checked": 1,
  "suspended": 1,
  "reactivated": 0,
  "errors": []
}
```

**Option B : Attendre 2h du matin (si cron job Vercel activé)**

---

### Étape 4 : Vérifier la Suspension

**En Base de Données :**
```sql
SELECT id, name, paid_until, features 
FROM tenants 
WHERE id = 'abc123...';
```

**Résultat attendu :**
```
features: {
  pos: false,
  inventory: false,
  employees: false,
  schedules: false,
  payroll: false,
  reports: false,
  loyalty: false,
  expenses: false,
  taxes: false,
  contacts: false,
  customRoles: false,
  api: false
}
```

---

### Étape 5 : Vérifier que les Utilisateurs Normaux sont Inactifs

```sql
SELECT id, email, role_id, status
FROM users
WHERE tenant_id = 'abc123...'
ORDER BY role_id, email;
```

**Résultat attendu :**
```
| Email             | role_id  | Status   |
|-------------------|----------|----------|
| admin@test1.com   | admin    | ACTIVE   | ✅ ACTIF (admin)
| user1@test1.com   | cashier  | INACTIVE | ❌ INACTIF
| user2@test1.com   | cashier  | INACTIVE | ❌ INACTIF
```

---

### Étape 6 : Vérifier que les Employés sont Inactifs

```sql
SELECT id, first_name, last_name, status
FROM employees
WHERE tenant_id = 'abc123...';
```

**Résultat attendu :**
```
| Name    | Status   |
|---------|----------|
| Juan    | INACTIVE | ❌ INACTIF
| María   | INACTIVE | ❌ INACTIF
```

---

### Étape 7 : Tester l'Accès Admin vs Utilisateur

**Admin peut se connecter :**
```
Tenant: test1 (192.168.1.132:3000)
Email: admin@test1.com
Password: password
→ ✅ Connexion réussie
→ ✅ Dashboard affiche "CUENTA SUSPENDIDA"
→ ✅ Aucun module visible (sauf alerte rouge)
```

**Utilisateur normal NE peut PAS se connecter :**
```
Tenant: test1
Email: user1@test1.com
Password: password
→ ❌ Erreur "Invalid login credentials" (car INACTIVE)
```

---

### Étape 8 : Vérifier les Requêtes API Bloquées

**Essayer de créer une transaction :**
```bash
curl -X POST http://localhost:3000/api/tenants/abc123.../transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100, "paymentMethod": "CASH"}'
```

**Résultat attendu :**
```json
{
  "error": "Subscription expired",
  "code": "SUBSCRIPTION_SUSPENDED",
  "status": 403
}
```

---

## 🎯 Scénario 2 : Réactivation après Paiement

### Étape 1 : Enregistrer un Paiement

**Via SuperAdmin Dashboard :**
1. Aller à **Tenants**
2. Chercher "Test Suspension 1"
3. Cliquer sur **💳 Payer** (bouton)
4. Remplir :
   - **Montant** : 500 (ou prix du plan)
   - **Valido hasta** : Une date future (ex: 2026-06-30)
   - **Método** : CASH
5. Cliquer **Registrar Pago**

**Ou via API (Postman) :**
```bash
PUT /api/superadmin/tenants/abc123.../payment

{
  "amount": 500,
  "paid_until": "2026-06-30T00:00:00Z",
  "payment_method": "CASH",
  "notes": "Test reactivation"
}
```

---

### Étape 2 : Vérifier la Réactivation Automatique

**En Base de Données (attendre 2-3 sec) :**

```sql
SELECT id, name, paid_until, features 
FROM tenants 
WHERE id = 'abc123...';
```

**Résultat attendu :**
```
paid_until: 2026-06-30 (futur)
features: {
  pos: true,
  inventory: true,
  employees: true,  -- Restauré per plan
  schedules: true,
  ...
}
```

```sql
SELECT id, email, role_id, status
FROM users
WHERE tenant_id = 'abc123...';
```

**Résultat attendu :**
```
| Email             | role_id  | Status   |
|-------------------|----------|----------|
| admin@test1.com   | admin    | ACTIVE   | ✅ ACTIF
| user1@test1.com   | cashier  | ACTIVE   | ✅ ACTIF (réactivé)
| user2@test1.com   | cashier  | ACTIVE   | ✅ ACTIF (réactivé)
```

---

### Étape 3 : Vérifier l'Accès aux Modules

**Admin accède au dashboard :**
```
Email: admin@test1.com
→ ✅ Connexion réussie
→ ✅ Alerte rouge DISPARUE
→ ✅ Tous les modules visibles (POS, Inventory, Employees, etc.)
→ ✅ Dashboard fonctionne normalement
```

**Utilisateur peut se reconnecter :**
```
Email: user1@test1.com
→ ✅ Connexion réussie
→ ✅ Peut créer des transactions
```

---

### Étape 4 : Vérifier que les Transactions Fonctionnent

```bash
curl -X POST http://localhost:3000/api/tenants/abc123.../transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 100, "paymentMethod": "CASH"}'
```

**Résultat attendu :**
```json
{
  "success": true,
  "transaction": {
    "id": "xyz789...",
    "amount": 100,
    "status": "completed"
  }
}
```

---

## 🎯 Scénario 3 : Alerte 7 Jours avant Expiration

### Étape 1 : Créer un Tenant Expirant dans 7 jours

```sql
UPDATE tenants
SET paid_until = NOW() + INTERVAL '7 days'  -- Expira dans 7 jours
WHERE id = 'abc123...';
```

---

### Étape 2 : Vérifier l'Alerte

**Admin se connecte :**
```
Email: admin@test1.com
→ Dashboard affiche une ALERTE JAUNE
→ Message: "Tu suscripción expira en 7 días"
→ Bouton: "Renovar Ahora"
```

---

## 🎯 Scénario 4 : Expiré 1-3 Jours (Pas encore Suspendu)

### Étape 1 : Créer un Tenant Expiré depuis 2 Jours

```sql
UPDATE tenants
SET paid_until = NOW() - INTERVAL '2 days'  -- Expiré depuis 2 jours
WHERE id = 'abc123...';
```

---

### Étape 2 : Vérifier le Comportement

**Avant le cron job :**
- ✅ Admin peut se connecter
- ✅ Modules sont ACTIFS (features = true)
- ✅ Alerte ROUGE affiche "Expirado hace 2 días"
- ✅ Utilisateurs normaux peuvent se connecter
- ✅ Les transactions FONCTIONNENT

**Après le cron job (>3 jours) :**
- ✅ Admin peut se connecter
- ✅ Modules DÉSACTIVÉS (features = false)
- ✅ Alerte affiche "CUENTA SUSPENDIDA"
- ❌ Utilisateurs normaux NE peuvent PAS se connecter
- ❌ Les transactions ÉCHOUENT (403)

---

## 🧬 Checklist de Test Complet

| Test | Status | Notes |
|------|--------|-------|
| Forcer expiration passée | ❓ | |
| Cron job suspend le tenant | ❓ | |
| Features = false après suspension | ❓ | |
| Admin reste ACTIF | ❓ | |
| Utilisateurs normaux = INACTIVE | ❓ | |
| Employés = INACTIVE | ❓ | |
| Admin voit alerte "CUENTA SUSPENDIDA" | ❓ | |
| API retourne 403 pour transactions | ❓ | |
| Paiement enregistré | ❓ | |
| Features restaurées per plan | ❓ | |
| Users redeviennent ACTIVE | ❓ | |
| Alerte disparaît | ❓ | |
| Admin peut créer transactions | ❓ | |
| Utilisateurs peuvent se reconnecter | ❓ | |
| Alerte 7 jours s'affiche en jaune | ❓ | |
| Alerte 1-3 jours s'affiche en rouge | ❓ | |
| Modules accessibles 1-3 jours | ❓ | |
| Modules inaccessibles >3 jours | ❓ | |

---

## 🐛 Dépannage

### ❓ Cron job ne s'exécute pas
1. Vérifier `vercel.json` existe et est correct
2. Redéployer sur Vercel
3. Attendre jusqu'à 2h du matin
4. Ou appeler manuellement : `POST /api/superadmin/payment/check-expirations`

### ❓ Admin ne peut pas se connecter
1. Vérifier que `role_id = 'admin'` pour cet utilisateur
2. Vérifier que `status = 'ACTIVE'` manuellement :
   ```sql
   UPDATE users SET status = 'ACTIVE' 
   WHERE email = 'admin@test1.com' 
   AND tenant_id = 'abc123...';
   ```
3. Reconnectez-vous

### ❓ Modules ne se réactivent pas
1. Vérifier que `enableTenantAccess()` a été appelé
2. Vérifier les logs : `console.log` affiche "Tenant X access enabled"
3. Vérifier que `paid_until` > NOW()

### ❓ Les transactions fonctionnent même si suspendu
1. Vérifier que l'endpoint `/api/tenants/.../transactions` appelle `checkPlanStatus()`
2. Vérifier que la réponse 403 est retournée
3. Vérifier le middleware d'authentification

---

## 📊 Visualisation du Flux

```
JOUR 0 (Expiration)
├─ paid_until = 2026-04-26 00:00:00
├─ Status = ACTIVE
└─ Modules = Tous true

JOUR 1-3 (Expiré < 3 jours)
├─ ⚠️ Alerte ROUGE "Expirado hace X días"
├─ ✅ Admin peut se connecter
├─ ✅ Modules accessibles
├─ ✅ Utilisateurs connectés
├─ ✅ Transactions fonctionnent
└─ ❌ Cron job NE fait RIEN

JOUR 4+ (Expiré > 3 jours)
├─ Cron job /api/.../check-expirations exécuté
├─ disableTenantAccess() appelé
├─ 🔴 Modules = Tous false
├─ 🔴 Utilisateurs normaux = INACTIVE
├─ ✅ Admin = ACTIVE (reste connecté)
├─ 🔴 Alerte "CUENTA SUSPENDIDA"
├─ ❌ Utilisateurs NE peuvent PAS se connecter
├─ ❌ Transactions retournent 403
└─ ❌ Dashboard: aucun module sauf alerte

À LA RÉACTIVATION (Paiement)
├─ enableTenantAccess() appelé
├─ ✅ Modules restaurés per plan
├─ ✅ Utilisateurs = ACTIVE
├─ ✅ Employés = ACTIVE
├─ ✅ Admin continuent à fonctionner
└─ ✅ Dashboard normal
```

---

## 🚀 Exécution du Test (Bash Script)

Créer `test-suspension.sh` :

```bash
#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TENANT_ID="abc123..."
API_URL="http://localhost:3000"

echo -e "${YELLOW}🧪 Test Suspension de Paiement${NC}"
echo ""

# Test 1: Forcer expiration
echo -e "${YELLOW}Test 1: Forcer expiration 4 jours avant${NC}"
echo "Via: npx supabase sql < set-expiration.sql"
read -p "Appuyez sur Entrée quand c'est fait..."

# Test 2: Exécuter cron job
echo -e "${YELLOW}Test 2: Exécuter le cron job${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/superadmin/payment/check-expirations")
if echo "$RESPONSE" | grep -q "suspended"; then
  echo -e "${GREEN}✅ Cron job exécuté${NC}"
  echo "$RESPONSE"
else
  echo -e "${RED}❌ Erreur${NC}"
fi

# Test 3: Vérifier les features
echo ""
echo -e "${YELLOW}Test 3: Vérifier que features = false${NC}"
echo "SELECT features FROM tenants WHERE id = '$TENANT_ID';"

# Test 4: Vérifier les utilisateurs
echo ""
echo -e "${YELLOW}Test 4: Vérifier que users sont INACTIVE (sauf admin)${NC}"
echo "SELECT email, role_id, status FROM users WHERE tenant_id = '$TENANT_ID';"

read -p "Vérifiez le résultat, puis appuyez sur Entrée..."

# Test 5: Tester l'API
echo ""
echo -e "${YELLOW}Test 5: Tester transaction bloquée (403)${NC}"
curl -X POST "$API_URL/api/tenants/$TENANT_ID/transactions" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' | jq .

echo ""
echo -e "${GREEN}✅ Tests de suspension terminés${NC}"
```

Exécuter :
```bash
chmod +x test-suspension.sh
./test-suspension.sh
```

---

## 📝 Notes

- Les tests locaux peuvent être plus rapides qu'en production
- Ne pas tester sur les vrais tenants en production !
- Toujours vérifier les logs : `npm run dev` affiche tout
- Documenter chaque résultat pour tracer les bugs
