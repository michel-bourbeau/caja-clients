# 🗂️ INDEX DES GUIDES DE TEST - SUSPENSION DE PAIEMENT

Vous êtes ici parce que vous voulez **tester que la suspension automatique fonctionne bien**. Voici tous les guides disponibles.

---

## 🎯 Où Commencer ?

### 👉 Je veux tester rapidement (10 min)
→ **Lire : [STEP_BY_STEP_TEST.md](STEP_BY_STEP_TEST.md)**
- Guide étape par étape très clair
- Avec résultats attendus pour chaque étape
- Parfait pour débuter

---

### 👉 Je veux tous les scénarios de test (45 min)
→ **Lire : [PAYMENT_SUSPENSION_TEST_GUIDE.md](PAYMENT_SUSPENSION_TEST_GUIDE.md)**
- 4 scénarios complètes
- 8 étapes par scénario
- Checklist complète
- Script bash pour automatiser

---

### 👉 Je veux tester via Postman (5 min)
→ **Importer : [POSTMAN_PAYMENT_SUSPENSION_TEST.json](POSTMAN_PAYMENT_SUSPENSION_TEST.json)**
- Collection Postman complète
- Endpoints API pré-configurés
- Variables à remplir

---

### 👉 Je veux tester via SQL direct (Supabase) (10 min)
→ **Utiliser : [sql/TEST_SUSPENSION_SCRIPTS.sql](sql/TEST_SUSPENSION_SCRIPTS.sql)**
- Scripts SQL prêts à copier/coller
- Préparation, suspension, vérification, réactivation
- Reset complet si erreur

---

### 👉 Je dois configurer le cron job Vercel
→ **Lire : [SUSPENSION_SUPERADMIN_GUIDE.md](SUSPENSION_SUPERADMIN_GUIDE.md#option-2--configuration-cron-job-recommandé)**
- Configuration pour Vercel
- Comment ça marche
- Comment tester manuellement

---

### 👉 Je veux comprendre l'architecture
→ **Lire : [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
- Architecture du contrôle d'accès
- Quels fichiers ont été modifiés
- Flux complet d'utilisation

---

## 📚 Tous les Documents

| Document | Durée | Public | Objectif |
|----------|-------|--------|----------|
| **STEP_BY_STEP_TEST.md** | 15 min | Testeurs | Test rapide et guidé |
| **PAYMENT_SUSPENSION_TEST_GUIDE.md** | 45 min | Testeurs | Tests exhaustifs (4 scénarios) |
| **POSTMAN_PAYMENT_SUSPENSION_TEST.json** | 5 min | Développeurs | Tests API avec Postman |
| **sql/TEST_SUSPENSION_SCRIPTS.sql** | 10 min | DBAs | Tests directs en SQL |
| **SUSPENSION_SUPERADMIN_GUIDE.md** | 10 min | SuperAdmins | Guide d'exploitation |
| **IMPLEMENTATION_SUMMARY.md** | 5 min | Développeurs | Vue d'ensemble technique |

---

## 🚀 PROCÉDURE RECOMMANDÉE

### Étape 1 : Comprendre (5 min)
Lire [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) pour comprendre :
- Quoi a changé
- Comment ça marche
- Quels fichiers sont impliqués

---

### Étape 2 : Tester Rapidement (15 min)
Suivre [STEP_BY_STEP_TEST.md](STEP_BY_STEP_TEST.md) pour :
- Forcer une expiration
- Exécuter le cron job
- Vérifier la suspension
- Réactiver et vérifier

---

### Étape 3 : Tester les Détails (45 min)
Utiliser [PAYMENT_SUSPENSION_TEST_GUIDE.md](PAYMENT_SUSPENSION_TEST_GUIDE.md) pour tester :
- Scénario 1 : Suspension automatique
- Scénario 2 : Réactivation
- Scénario 3 : Alerte 7 jours
- Scénario 4 : Alerte 1-3 jours

---

### Étape 4 : Automatiser les Tests (10 min)
Si vous avez Postman :
1. Importer [POSTMAN_PAYMENT_SUSPENSION_TEST.json](POSTMAN_PAYMENT_SUSPENSION_TEST.json)
2. Configurer les variables
3. Exécuter les requests

---

### Étape 5 : Valider en Production
Avant de déployer :
- [ ] Tous les scénarios testés
- [ ] Aucun bug trouvé
- [ ] AdminS peuvent se connecter quand suspendu
- [ ] Utilisateurs normaux NE peuvent pas
- [ ] API retournent 403
- [ ] Réactivation fonctionne

---

## 🧪 TESTS DISPONIBLES

### Test 1 : Suspension Automatique
```
Expiré depuis 4 jours
    ↓
Cron job exécuté
    ↓
Modules = false
Users (non-admin) = INACTIVE
Admin = ACTIVE (voit alerte)
    ↓
API retourne 403
```
**Voir :** [STEP_BY_STEP_TEST.md#test-1-suspension-automatique](STEP_BY_STEP_TEST.md)

---

### Test 2 : Réactivation
```
Paiement enregistré
    ↓
enableTenantAccess() appelé
    ↓
Modules restaurés
Users = ACTIVE
    ↓
Dashboard normal
API fonctionne (200)
```
**Voir :** [STEP_BY_STEP_TEST.md#test-2-réactivation](STEP_BY_STEP_TEST.md)

---

### Test 3 : Alerte 7 Jours
```
Expiration dans 7 jours
    ↓
Admin se connecte
    ↓
Alerte JAUNE: "Tu suscripción expira en 7 días"
Modules = ACCESSIBLES
```
**Voir :** [PAYMENT_SUSPENSION_TEST_GUIDE.md#scénario-3](PAYMENT_SUSPENSION_TEST_GUIDE.md)

---

### Test 4 : Alerte 1-3 Jours
```
Expiré depuis 2 jours
    ↓
Admin se connecte
    ↓
Alerte ROUGE: "Expirado hace 2 días"
Modules = ACCESSIBLES (pas encore suspendus)
Utilisateurs = Peuvent se connecter
    ↓
Cron job NE fait RIEN (< 3 jours)
```
**Voir :** [PAYMENT_SUSPENSION_TEST_GUIDE.md#scénario-4](PAYMENT_SUSPENSION_TEST_GUIDE.md)

---

## 💻 OUTILS DISPONIBLES

### 1. SQL Scripts (Supabase)
**Fichier :** `sql/TEST_SUSPENSION_SCRIPTS.sql`

**Contient :**
- ✅ Récupérer un tenant de test
- ✅ Forcer une expiration
- ✅ Simuler la suspension (sans cron)
- ✅ Simuler la réactivation
- ✅ Reset complet

**Utilisation :**
1. Ouvrir Supabase SQL Editor
2. Copier/coller les scripts
3. Exécuter

---

### 2. Postman Collection
**Fichier :** `POSTMAN_PAYMENT_SUSPENSION_TEST.json`

**Contient :**
- ✅ Check tenant status (before)
- ✅ Execute cron job
- ✅ Try blocked API (403)
- ✅ Register payment
- ✅ Check tenant status (after)
- ✅ Test API (success)

**Utilisation :**
1. Importer dans Postman
2. Set variables (TENANT_ID, USER_TOKEN)
3. Run requests

---

### 3. Bash Script (Automatisation)
**Dans :** [PAYMENT_SUSPENSION_TEST_GUIDE.md](PAYMENT_SUSPENSION_TEST_GUIDE.md#-exécution-du-test-bash-script)

**Utilisation :**
```bash
chmod +x test-suspension.sh
./test-suspension.sh
```

---

## ✅ CHECKLIST PRE-DÉPLOIEMENT

Avant de mettre en production :

- [ ] Test 1 : Suspension automatique ✅
- [ ] Test 2 : Réactivation ✅
- [ ] Test 3 : Alerte 7 jours ✅
- [ ] Test 4 : Alerte 1-3 jours ✅
- [ ] Admin peut se connecter quand suspendu ✅
- [ ] Admin ne voit QUE l'alerte (pas de modules) ✅
- [ ] Utilisateur normal NE peut PAS se connecter ✅
- [ ] Employés sont inactifs ✅
- [ ] API retourne 403 ✅
- [ ] Réactivation restaure modules ✅
- [ ] Réactivation restaure utilisateurs ✅
- [ ] Réactivation restaure employés ✅
- [ ] Alerte disparaît après réactivation ✅
- [ ] vercel.json est déployé ✅
- [ ] Cron job s'exécute (vérifier logs Vercel) ✅

---

## 📊 STATUS ACTUEL

✅ **Tous les tests sont prêts à être exécutés**

### Documents Disponibles
- [x] STEP_BY_STEP_TEST.md (guide guidé)
- [x] PAYMENT_SUSPENSION_TEST_GUIDE.md (exhaustif)
- [x] sql/TEST_SUSPENSION_SCRIPTS.sql (SQL)
- [x] POSTMAN_PAYMENT_SUSPENSION_TEST.json (Postman)
- [x] SUSPENSION_SUPERADMIN_GUIDE.md (SuperAdmin)
- [x] IMPLEMENTATION_SUMMARY.md (Architecture)

### Code Implémenté
- [x] `src/lib/utils/tenantAccessControl.ts` (logic de suspension/réactivation)
- [x] `vercel.json` (cron job configuré)
- [x] API endpoints (déjà existants, juste protégés)

---

## 🎯 PROCHAINES ÉTAPES

1. **Choisir un guide** ci-dessus
2. **Exécuter les tests**
3. **Vérifier les résultats**
4. **Déployer sur Vercel**
5. **Monitorer les logs**

---

## 🆘 BESOIN D'AIDE ?

| Question | Réponse |
|----------|---------|
| Où commencer ? | [STEP_BY_STEP_TEST.md](STEP_BY_STEP_TEST.md) |
| Quel est le flux complet ? | [PAYMENT_SUSPENSION_TEST_GUIDE.md](PAYMENT_SUSPENSION_TEST_GUIDE.md) |
| Comment tester avec API ? | [POSTMAN_PAYMENT_SUSPENSION_TEST.json](POSTMAN_PAYMENT_SUSPENSION_TEST.json) |
| Quels scripts SQL ? | [sql/TEST_SUSPENSION_SCRIPTS.sql](sql/TEST_SUSPENSION_SCRIPTS.sql) |
| C'est quoi qui a changé ? | [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) |
| Comment configurer Vercel ? | [SUSPENSION_SUPERADMIN_GUIDE.md](SUSPENSION_SUPERADMIN_GUIDE.md) |

---

## 💾 Fichiers de Référence

```
docs/
├── STEP_BY_STEP_TEST.md                    👈 COMMENCER ICI
├── PAYMENT_SUSPENSION_TEST_GUIDE.md
├── POSTMAN_PAYMENT_SUSPENSION_TEST.json
├── SUSPENSION_SUPERADMIN_GUIDE.md
├── IMPLEMENTATION_SUMMARY.md
├── TEST_GUIDES_INDEX.md                    (ce fichier)
└── sql/
    └── TEST_SUSPENSION_SCRIPTS.sql

src/
├── lib/utils/
│   └── tenantAccessControl.ts              (modifié)
└── app/api/
    └── superadmin/payment/
        └── check-expirations/route.ts      (corrigé)

vercel.json                                  (créé)
```

---

## 🎉 C'EST PRÊT !

**Vous pouvez commencer à tester maintenant.**

**Recommandation :** Commencer par [STEP_BY_STEP_TEST.md](STEP_BY_STEP_TEST.md) pour un test rapide.

Bonne chance ! 🚀
