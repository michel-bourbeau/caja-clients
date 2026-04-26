# 🎯 GUIDE DE TEST ÉTAPE PAR ÉTAPE

## 📌 Prérequis

- [ ] Avoir `npm run dev` qui tourne (`http://localhost:3000`)
- [ ] Accès à Supabase dashboard
- [ ] Un tenant de test (ex: "Test Suspension")
- [ ] Postman (optionnel, mais recommandé)

---

## ⏱️ Durée Totale : 15-20 minutes

---

## 🧪 TEST 1 : SUSPENSION AUTOMATIQUE

### Phase 1 : Préparation (2 min)

**Étape 1a :** Identifier votre tenant de test

```sql
-- Dans Supabase SQL Editor:
SELECT id, name, plan, paid_until
FROM tenants
WHERE name = 'Test Suspension'
LIMIT 1;
```

**Résultat :**
```
| ID                  | Name              | Plan           | Paid Until      |
|---------------------|-------------------|----------------|-----------------|
| abc123def456...     | Test Suspension   | professional   | 2026-05-26      |
```

📌 **Note le TENANT_ID : `abc123def456...`**

---

**Étape 1b :** Vérifier l'état initial des utilisateurs

```sql
SELECT email, role_id, status
FROM users
WHERE tenant_id = 'abc123def456...'
ORDER BY role_id;
```

**Résultat attendu :**
```
| Email                  | Role ID | Status |
|------------------------|---------|--------|
| admin@test1.com        | admin   | ACTIVE |
| user1@test1.com        | cashier | ACTIVE |
| user2@test1.com        | cashier | ACTIVE |
```

✅ **Tous les utilisateurs sont ACTIFS**

---

### Phase 2 : Forcer une Expiration (2 min)

**Étape 2 :** Mettre à jour l'expiration à 4 jours dans le passé

```sql
UPDATE tenants
SET paid_until = NOW() - INTERVAL '4 days'
WHERE id = 'abc123def456...'
RETURNING paid_until;
```

**Résultat :**
```
| Paid Until           |
|----------------------|
| 2026-04-22 14:30:00  | (aujourd'hui = 2026-04-26)
```

✅ **Le tenant est expiré depuis 4 jours**

---

### Phase 3 : Exécuter le Cron Job (3 min)

**Étape 3a :** Appel API pour déclencher la vérification

```bash
# Option 1: Avec curl
curl -X POST http://localhost:3000/api/superadmin/payment/check-expirations \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Ou Option 2 : Avec Postman**
```
Method: POST
URL: http://localhost:3000/api/superadmin/payment/check-expirations
Body: {}
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

✅ **1 tenant suspendu**

---

### Phase 4 : Vérifier la Suspension (5 min)

**Étape 4a :** Vérifier que les modules sont désactivés

```sql
SELECT 
  features ->> 'pos' as pos,
  features ->> 'inventory' as inventory,
  features ->> 'employees' as employees,
  features ->> 'schedules' as schedules
FROM tenants
WHERE id = 'abc123def456...';
```

**Résultat attendu :**
```
| pos   | inventory | employees | schedules |
|-------|-----------|-----------|-----------|
| false | false     | false     | false     |
```

✅ **Tous les modules = false**

---

**Étape 4b :** Vérifier que seul l'admin est actif

```sql
SELECT email, role_id, status
FROM users
WHERE tenant_id = 'abc123def456...'
ORDER BY role_id;
```

**Résultat attendu :**
```
| Email                  | Role ID  | Status   |
|------------------------|----------|----------|
| admin@test1.com        | admin    | ACTIVE   | ✅ RESTE ACTIF
| user1@test1.com        | cashier  | INACTIVE | ❌ DÉSACTIVÉ
| user2@test1.com        | cashier  | INACTIVE | ❌ DÉSACTIVÉ
```

✅ **Admin = ACTIVE, Utilisateurs = INACTIVE**

---

**Étape 4c :** Vérifier que les employés sont inactifs

```sql
SELECT first_name, last_name, status
FROM employees
WHERE tenant_id = 'abc123def456...';
```

**Résultat attendu :**
```
| First Name | Last Name | Status   |
|------------|-----------|----------|
| Juan       | García    | INACTIVE |
| María      | Rodríguez | INACTIVE |
```

✅ **Tous les employés = INACTIVE**

---

**Étape 4d :** Tester l'accès au dashboard

1. **Ouvrir le navigateur :**
   ```
   http://localhost:3000
   ```

2. **Se connecter avec l'admin :**
   ```
   Email: admin@test1.com
   Password: [votre password]
   Tenant: test (depuis le sous-domaine)
   ```

3. **Résultat attendu :**
   - ✅ Connexion réussie
   - ✅ Dashboard s'affiche
   - ✅ Alerte ROUGE "CUENTA SUSPENDIDA" au haut
   - ✅ Message: "Votre suscripción ha expirado hace 4 días"
   - ✅ Aucun module visible (sauf l'alerte)

---

**Étape 4e :** Tester qu'un utilisateur normal NE peut PAS se connecter

1. **Essayer de se connecter avec :**
   ```
   Email: user1@test1.com
   Password: [votre password]
   ```

2. **Résultat attendu :**
   - ❌ Erreur "Invalid login credentials"
   - (Car l'utilisateur est INACTIVE)

---

**Étape 4f :** Tester que les API sont bloquées

```bash
# Avec le token du tenant (si disponible)
curl -X POST http://localhost:3000/api/tenants/abc123def456.../transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100,
    "paymentMethod": "CASH"
  }'
```

**Résultat attendu :**
```json
{
  "error": "Subscription expired",
  "code": "SUBSCRIPTION_SUSPENDED",
  "status": 403
}
```

✅ **API bloquée avec 403**

---

## 🎉 TEST 2 : RÉACTIVATION

### Phase 1 : Enregistrer un Paiement (3 min)

**Étape 1a :** Via SuperAdmin Dashboard

1. Aller à : `http://localhost:3000/superadmin/login`
2. Entrer le mot de passe
3. Cliquer sur **Tenants**
4. Chercher "Test Suspension"
5. Cliquer le bouton **💳 Payer**
6. Remplir :
   - **Montant** : 500
   - **Valido hasta** : 2026-06-30
   - **Método** : CASH
7. Cliquer **Registrar Pago**

**Ou Étape 1b :** Via API (Postman)

```bash
curl -X PUT http://localhost:3000/api/superadmin/tenants/abc123def456.../payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "paid_until": "2026-06-30T00:00:00Z",
    "payment_method": "CASH",
    "notes": "Test reactivation"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "accessRestored": true,
  "message": "Payment recorded and access restored"
}
```

✅ **Paiement enregistré et accès restauré automatiquement**

---

### Phase 2 : Vérifier la Réactivation (5 min)

**Étape 2a :** Vérifier que les modules sont restaurés

```sql
SELECT 
  features ->> 'pos' as pos,
  features ->> 'inventory' as inventory,
  features ->> 'employees' as employees,
  paid_until
FROM tenants
WHERE id = 'abc123def456...';
```

**Résultat attendu :**
```
| pos   | inventory | employees | Paid Until          |
|-------|-----------|-----------|---------------------|
| true  | true      | true      | 2026-06-30 00:00:00 |
```

✅ **Modules restaurés per plan (professional)**

---

**Étape 2b :** Vérifier que les utilisateurs sont réactivés

```sql
SELECT email, role_id, status
FROM users
WHERE tenant_id = 'abc123def456...'
ORDER BY role_id;
```

**Résultat attendu :**
```
| Email                  | Role ID  | Status |
|------------------------|----------|--------|
| admin@test1.com        | admin    | ACTIVE |
| user1@test1.com        | cashier  | ACTIVE | ✅ RÉACTIVÉ
| user2@test1.com        | cashier  | ACTIVE | ✅ RÉACTIVÉ
```

✅ **Tous les utilisateurs = ACTIVE**

---

**Étape 2c :** Vérifier que les employés sont réactivés

```sql
SELECT first_name, last_name, status
FROM employees
WHERE tenant_id = 'abc123def456...';
```

**Résultat attendu :**
```
| First Name | Last Name | Status |
|------------|-----------|--------|
| Juan       | García    | ACTIVE | ✅
| María      | Rodríguez | ACTIVE | ✅
```

✅ **Tous les employés = ACTIVE**

---

**Étape 2d :** Tester l'accès au dashboard (sans alerte)

1. **Se déconnecter** (si connecté)
2. **Se reconnecter avec l'admin :**
   ```
   Email: admin@test1.com
   Password: [votre password]
   ```

3. **Résultat attendu :**
   - ✅ Connexion réussie
   - ✅ Dashboard s'affiche
   - ✅ **L'alerte ROUGE a DISPARU** ✨
   - ✅ Tous les modules sont visibles (POS, Inventory, Employees, etc.)
   - ✅ Dashboard fonctionne normalement

---

**Étape 2e :** Tester qu'un utilisateur peut se reconnecter

1. **Se connecter avec :**
   ```
   Email: user1@test1.com
   Password: [votre password]
   ```

2. **Résultat attendu :**
   - ✅ Connexion réussie
   - ✅ Dashboard s'affiche

---

**Étape 2f :** Tester que les API fonctionnent

```bash
curl -X POST http://localhost:3000/api/tenants/abc123def456.../transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100,
    "paymentMethod": "CASH"
  }'
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

✅ **API fonctionne (200 OK)**

---

## 📊 RÉSUMÉ DU TEST

### Avant Suspension
```
✅ Modules: true
✅ Admin: ACTIVE
✅ Users: ACTIVE
✅ API: Fonctionne
```

### Après Suspension
```
❌ Modules: false
✅ Admin: ACTIVE (peut voir l'alerte)
❌ Users: INACTIVE (ne peuvent pas se connecter)
❌ API: Bloquée (403)
```

### Après Réactivation
```
✅ Modules: true
✅ Admin: ACTIVE
✅ Users: ACTIVE
✅ API: Fonctionne
```

---

## 🐛 Si Quelque Chose ne Fonctionne Pas

### ❌ Le cron job ne suspend pas le tenant

**Solution :**
1. Vérifier que l'expiration est bien < NOW() - 3 days
2. Vérifier les logs du navigateur (npm run dev)
3. Essayer d'appeler manuellement : `POST /api/superadmin/payment/check-expirations`

---

### ❌ L'admin ne peut pas se connecter

**Solution :**
1. Vérifier en DB :
   ```sql
   SELECT role_id, status FROM users 
   WHERE email = 'admin@test1.com' 
   AND tenant_id = 'abc123def456...';
   ```
2. Si status = INACTIVE, les réactiver manuellement :
   ```sql
   UPDATE users SET status = 'ACTIVE' 
   WHERE role_id = 'admin' 
   AND tenant_id = 'abc123def456...';
   ```

---

### ❌ Les modules ne se réactivent pas

**Solution :**
1. Vérifier que paid_until > NOW()
2. Vérifier que enableTenantAccess() a été appelé
3. Regarder les logs pour les erreurs

---

## ✅ Checklist Finale

- [ ] ✅ Tenant expiré depuis 4 jours
- [ ] ✅ Cron job exécuté avec succès (1 suspended)
- [ ] ✅ Modules = false
- [ ] ✅ Admin = ACTIVE, Utilisateurs = INACTIVE
- [ ] ✅ Admin voit "CUENTA SUSPENDIDA"
- [ ] ✅ Utilisateur ne peut pas se connecter
- [ ] ✅ API retourne 403
- [ ] ✅ Paiement enregistré
- [ ] ✅ Modules = true (restored)
- [ ] ✅ Utilisateurs = ACTIVE
- [ ] ✅ Admin voit dashboard normal (pas d'alerte)
- [ ] ✅ Utilisateur peut se reconnecter
- [ ] ✅ API fonctionne (200 OK)

---

## 🎉 Vous avez terminé !

Tous les tests passent = **Implémentation réussie** ✨

---

## 📞 Support

Si un test échoue :
1. Noter exactement quel test a échoué
2. Copier l'erreur complète
3. Consulter la section "Dépannage" plus bas
4. Vérifier les logs : `npm run dev` les affiche en temps réel
