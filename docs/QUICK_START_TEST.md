# ⚡ QUICK START - Tester en 5 Minutes

## 🎯 Objectif
Tester que la suspension fonctionne : Admin peut se connecter mais ne voit QUE l'alerte.

---

## ⏱️ 5 MINUTES

### Étape 1 : ID du Tenant (30 sec)

**Supabase SQL Editor :**
```sql
SELECT id, name FROM tenants WHERE name LIKE 'Test%' LIMIT 1;
```

📌 **Copier le ID** → `TENANT_ID`

---

### Étape 2 : Forcer l'Expiration (30 sec)

```sql
UPDATE tenants
SET paid_until = NOW() - INTERVAL '4 days'
WHERE id = 'TENANT_ID'  -- remplacer avec le vrai ID
RETURNING paid_until;
```

✅ **Vérifié : expiré depuis 4 jours**

---

### Étape 3 : Exécuter le Cron Job (1 min)

**Terminal ou Browser :**
```bash
curl -X POST http://localhost:3000/api/superadmin/payment/check-expirations
```

**Résultat attendu :**
```
{
  "suspended": 1
}
```

✅ **Vérifié : 1 tenant suspendu**

---

### Étape 4 : Vérifier la Suspension (1 min)

**Supabase SQL Editor :**
```sql
-- Modules désactivés ?
SELECT features ->> 'pos' as pos FROM tenants WHERE id = 'TENANT_ID';
-- Résultat: false ✅

-- Admin resté actif ?
SELECT role_id, status FROM users 
WHERE tenant_id = 'TENANT_ID' AND role_id = 'admin';
-- Résultat: admin, ACTIVE ✅

-- Utilisateurs inactifs ?
SELECT COUNT(*) FROM users 
WHERE tenant_id = 'TENANT_ID' AND status = 'INACTIVE' AND role_id != 'admin';
-- Résultat: > 0 ✅
```

✅ **Suspension appliquée**

---

### Étape 5 : Tester le Dashboard (1.5 min)

1. **Se connecter :**
   ```
   http://localhost:3000
   Email: admin@test.com
   ```

2. **Vérifier :**
   - ✅ Connexion réussie
   - ✅ Alerte ROUGE: "CUENTA SUSPENDIDA"
   - ✅ Aucun module visible

✅ **Dashboard suspendu correctement**

---

## ✨ C'est Tout !

**Vous avez validé :**
- ✅ Suspension automatique
- ✅ Admin peut se connecter
- ✅ Modules désactivés
- ✅ Alerte affichée

---

## 📖 Pour Aller Plus Loin

- Tests complets ? → [STEP_BY_STEP_TEST.md](STEP_BY_STEP_TEST.md)
- Tous les scénarios ? → [PAYMENT_SUSPENSION_TEST_GUIDE.md](PAYMENT_SUSPENSION_TEST_GUIDE.md)
- Index complet ? → [TEST_GUIDES_INDEX.md](TEST_GUIDES_INDEX.md)
