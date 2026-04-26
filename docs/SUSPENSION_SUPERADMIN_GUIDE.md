# 🔒 Suspension de Compte - Configuration du SuperAdmin

## Résumé Automatique

Lorsqu'une souscription expire depuis plus de 3 jours :

1. ✅ **Tous les modules** sont désactivés (POS, Inventaire, Employés, etc.)
2. ✅ **Tous les utilisateurs** passent à `INACTIVE` (ne peuvent plus se connecter)
3. ✅ **Tous les employés** passent à `INACTIVE` (ne peuvent plus pointer)
4. ✅ **Les transactions** ne peuvent plus être créées (API retourne 403)

Lorsqu'un paiement est enregistré :

1. ✅ **Les modules** sont restaurés selon le plan du tenant
2. ✅ **Les utilisateurs** reviennent à `ACTIVE`
3. ✅ **Les employés** reviennent à `ACTIVE`
4. ✅ **L'accès complet** est restauré

---

## Vérification Manuelle des Expirations

### Option 1 : Appel API Direct

```bash
curl -X POST https://votre-app.com/api/superadmin/payment/check-expirations
```

**Réponse :**
```json
{
  "message": "Payment expiration check completed",
  "checked": 150,
  "suspended": 12,
  "reactivated": 0,
  "errors": []
}
```

### Option 2 : Configuration Cron Job (Recommandé)

#### Vercel Crons

Ajouter dans `vercel.json` :
```json
{
  "crons": [
    {
      "path": "/api/superadmin/payment/check-expirations",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Cela exécutera tous les jours à 2h du matin.

#### AWS Lambda / External Cron Service

```bash
# Ajouter une tâche cron qui appelle :
curl -X POST https://votre-app.com/api/superadmin/payment/check-expirations \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

#### Fréquence Recommandée

- **Quotidienne** : Vérification plus régulière, meilleures performances
- **Hebdomadaire** : Si vous avez peu de clients avec expirations proches

---

## Enregistrement Manuel de Paiement

### Via SuperAdmin Dashboard

1. Aller à **SuperAdmin → Tenants**
2. Cliquer sur **"💳 Payer"** (Payer tenant)
3. Remplir le formulaire :
   - **Montant** : Prix du plan
   - **Valido hasta** : Date d'expiration future
   - **Método de Pago** : CASH, BANK_TRANSFER, CARD
   - **Notas** : (Optionnel)
4. Cliquer **"Registrar Pago"**

### Résultat Automatique

✅ Tenant est **automatiquement réactivé** :
- Modules restaurés
- Utilisateurs réactivés
- Employés réactivés
- Aucune action supplémentaire nécessaire

---

## Vérifier le Statut d'un Tenant

### En Base de Données

```sql
-- Voir si un tenant est suspendu (expiré > 3 jours)
SELECT 
  id, 
  name, 
  plan,
  paid_until,
  (CURRENT_TIMESTAMP - paid_until) as days_expired,
  features
FROM tenants
WHERE paid_until < NOW() - INTERVAL '3 days'
ORDER BY paid_until DESC;

-- Voir les utilisateurs inactifs
SELECT COUNT(*) as inactive_users
FROM users
WHERE tenant_id = 'UUID_DU_TENANT'
  AND status = 'INACTIVE';

-- Voir les employés inactifs
SELECT COUNT(*) as inactive_employees
FROM employees
WHERE tenant_id = 'UUID_DU_TENANT'
  AND status = 'INACTIVE';

-- Voir l'historique de paiement
SELECT *
FROM payment_history
WHERE tenant_id = 'UUID_DU_TENANT'
ORDER BY payment_date DESC;
```

---

## Timeline des Actions Automatiques

```
Jour 0 (Expiration)
├─ Aucune action

Jour 1-3 (Expiré depuis < 3 jours)
├─ ⚠️ Tenant peut encore utiliser l'app
├─ ⚠️ Dashboard affiche "Expired" warning (rouge)
└─ ⚠️ Message: "Pay within 3 days or account will be suspended"

Jour 4+ (Expiré depuis > 3 jours)
├─ Cron job `/api/superadmin/payment/check-expirations` exécuté
├─ 🔴 disableTenantAccess() appelé pour ce tenant
├─ 🔴 Tous les modules désactivés
├─ 🔴 Tous les utilisateurs → INACTIVE
├─ 🔴 Tous les employés → INACTIVE
├─ 🔴 Les transactions ne peuvent plus être créées
└─ 🔴 Dashboard affiche "CUENTA SUSPENDIDA"

À la réactivation (Paiement enregistré)
├─ 💾 enableTenantAccess() appelé automatiquement
├─ ✅ Modules restaurés per plan
├─ ✅ Utilisateurs → ACTIVE
├─ ✅ Employés → ACTIVE
├─ ✅ Les transactions peuvent être créées normalement
└─ ✅ Dashboard visible comme avant
```

---

## Configuration des Seuils

**Actuellement :**
- **Warning** : 7 jours avant expiration
- **Suspension** : Expiré depuis 3 jours

Pour modifier, éditez :
- `src/lib/hooks/usePaymentStatus.ts` (ligne 39-40)
- `src/lib/utils/planStatusCheck.ts` (ligne 23)
- `src/app/api/superadmin/payment/check-expirations/route.ts` (ligne 17)

---

## Dépannage

### ❓ Le tenant ne se suspend pas après 3 jours
1. Vérifier que le cron job s'exécute
   ```sql
   SELECT * FROM payment_history ORDER BY created_at DESC LIMIT 10;
   ```
2. Appeler manuellement :
   ```bash
   curl -X POST https://votre-app.com/api/superadmin/payment/check-expirations
   ```
3. Vérifier les logs pour les erreurs

### ❓ Les utilisateurs ne sont pas réactivés après un paiement
1. Vérifier que le paiement a été enregistré correctement
   ```sql
   SELECT * FROM payment_history 
   WHERE tenant_id = 'TENANT_ID' 
   ORDER BY payment_date DESC 
   LIMIT 1;
   ```
2. Vérifier que `paid_until` est dans le futur
3. Vérifier les utilisateurs :
   ```sql
   SELECT * FROM users 
   WHERE tenant_id = 'TENANT_ID' 
   AND status = 'ACTIVE';
   ```

### ❓ Un tenant n'a pas son plan restauré correctement
- Plan **basic** : POS, Inventory uniquement
- Plan **professional** : POS, Inventory, Employees, Schedules, Reports, Taxes
- Plan **enterprise** : Tous les modules
- Plan **custom** : Aucun module (à configurer manuellement)

---

## Webhook de Notification (Optionnel)

Pour notifier les tenants qu'ils vont être suspendus, vous pouvez ajouter :

```typescript
// Dans enableTenantAccess/disableTenantAccess
await notifyTenant(tenantId, {
  status: 'suspended',
  message: 'Votre compte a été suspendu. Veuillez effectuer le paiement.',
  email: tenant.email
});
```

(À implémenter selon votre système d'email)
