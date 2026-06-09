# Plan — Système de session de caisse (ouverture / fermeture)

> Statut : **brouillon de design** — à valider avant implémentation
> Date : 8 mai 2026

## Décisions validées

1. **Items à compter** : configuration au niveau Admin (colonne `track_in_count` sur `products`)
2. **Granularité** : une session par **quart** (matin / après-midi / soir / custom)
3. **Multi-employés** : plusieurs employés rattachés à une même session
4. Approche : wireframes UX d'abord, puis migration SQL, puis écrans

---

## Architecture des écrans

```
DASHBOARD
   │
   ├── /dashboard/cash-sessions                ← Liste des sessions (admin + employé)
   │     │
   │     ├── [bouton "Ouvrir une session"]    → Écran 2
   │     ├── [session OPEN: Continuer]        → Écran 3 ou 4
   │     └── [session CLOSED: Voir détails]   → Écran 6 (admin) / Écran 7 (employé)
   │
   ├── /dashboard/settings/count-items         ← Config admin (items à compter)
   │
   └── /dashboard/pos                          ← POS (existant, pas de changement)
```

---

## Écran 1 — Liste des sessions

```
╔══════════════════════════════════════════════════════════╗
║  Sessions de caisse                  [+ Ouvrir session]  ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  🟢 EN COURS                                             ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Quart matin · Ouvert à 08:15 par Maria             │  ║
║  │ 12 items à recompter en fermeture                  │  ║
║  │                              [ Continuer / Fermer ]│  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                          ║
║  AUJOURD'HUI                                             ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ ✅ Quart soir hier  · Maria → Carlos               │  ║
║  │    Caisse: équilibrée    Stock: 1 écart mineur     │  ║
║  │                                       [ Détails ]  │  ║
║  └────────────────────────────────────────────────────┘  ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ ⚠️ Quart matin hier · Juan                         │  ║
║  │    Caisse: -340 C$       Stock: 2 écarts           │  ║
║  │                                       [ Détails ]  │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                          ║
║  HIER · 6 MAI                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ ✅ ... ✅ ... ⚠️ ...                               │  ║
║  └────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════╝
```

---

## Écran 2 — Ouverture de session (3 étapes)

### 2a · Démarrage

```
╔══════════════════════════════════════════════════════════╗
║  ← Ouvrir une session de caisse                          ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ●━━━○━━━○  1/3 · Démarrage                       ║
║                                                          ║
║  Nom du quart      [ Quart matin            ▾ ]          ║
║                    Matin · Après-midi · Soir · Custom    ║
║                                                          ║
║  Employés du quart                                       ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ ✓ Maria González   (vous)                           │ ║
║  │ ☐ Carlos Pérez                                      │ ║
║  │ ☐ Juan López                                        │ ║
║  │ ☐ Ana Ruiz                                          │ ║
║  └─────────────────────────────────────────────────────┘ ║
║  ℹ Plusieurs employés peuvent compter / vendre durant   ║
║    le quart. La fermeture peut être faite par un autre. ║
║                                                          ║
║                                       [ Continuer → ]    ║
╚══════════════════════════════════════════════════════════╝
```

### 2b · Fond de caisse

```
╔══════════════════════════════════════════════════════════╗
║  ← Ouverture · Quart matin                               ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ○━━━●━━━○  2/3 · Fond de caisse                  ║
║                                                          ║
║  💵 Cash dans la caisse au démarrage                     ║
║                                                          ║
║         ┌────────────────────────────┐                   ║
║         │  C$  [   2 000.00       ]  │                   ║
║         └────────────────────────────┘                   ║
║                                                          ║
║  Notes (optionnel)                                       ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │                                                     │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║                          [ ← Retour ] [ Continuer → ]    ║
╚══════════════════════════════════════════════════════════╝
```

### 2c · Comptage initial

```
╔══════════════════════════════════════════════════════════╗
║  ← Ouverture · Quart matin                               ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ○━━━○━━━●  3/3 · Comptage initial                ║
║                                                          ║
║  ┌──────────────────────────────────────────────────────┐║
║  │ ℹ️ Vous avez fermé le magasin hier soir (Maria,      │║
║  │    21:45). Le stock de fermeture peut servir de      │║
║  │    fond d'ouverture.                                 │║
║  │                                                      │║
║  │  ☑ Je confirme que c'est moi qui ai fermé hier       │║
║  │    et le stock n'a pas bougé. Reprendre les valeurs. │║
║  │                                                      │║
║  │           [ Recompter quand même ]  [ Reprendre ✓ ]  │║
║  └──────────────────────────────────────────────────────┘║
║                                                          ║
║  📦 Items à compter (configurés par l'admin)             ║
║  Comptez chaque item présent en stock.                   ║
║                                                          ║
║  ALCOOLS · 5 items                                       ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │  Toña 12oz                          [    24    ]    │ ║
║  │  Toña Litro                         [    8     ]    │ ║
║  │  Victoria Frost                     [    18    ]    │ ║
║  │  Flor de Caña 4 ans                 [    3     ]    │ ║
║  │  Flor de Caña 7 ans                 [    1     ]    │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  VIANDES · 3 items                                       ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │  Pollo entier                       [    6     ]    │ ║
║  │  Carne molida (kg)                  [    4     ]    │ ║
║  │  ...                                                │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║                  [ ← Retour ]  [ Ouvrir le magasin ✓ ]   ║
╚══════════════════════════════════════════════════════════╝
```

> **Reprise rapide** : si l'employé qui ouvre est **le même** que celui qui a fermé la session précédente (`opened_by_id == previous.closed_by_id`), une bannière propose de **reprendre les valeurs de fermeture** comme fond d'ouverture (cash + comptages items). L'événement est tracé : `cash_sessions.opening_method = 'CARRIED_OVER' | 'COUNTED'` et l'admin peut filtrer dessus.

---

## Écran 3 — Session ouverte (statut "en cours")

```
╔══════════════════════════════════════════════════════════╗
║  Session quart matin · Ouverte à 08:15           🟢 OPEN ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  ┌──────────────────────────────────────────────────────┐║
║  │  💰 Fond de caisse:           C$ 2 000.00            │║
║  │  📊 Ventes du quart:          C$ 4 350.00 (12 ventes)│║
║  │  👥 Employés actifs:          Maria, Carlos          │║
║  │  📦 Items à recompter:        12                     │║
║  └──────────────────────────────────────────────────────┘║
║                                                          ║
║  Que voulez-vous faire ?                                 ║
║                                                          ║
║   ┌──────────────────┐  ┌──────────────────┐             ║
║   │   🛒              │  │   🔒              │             ║
║   │   Aller au POS   │  │  Fermer la       │             ║
║   │                  │  │  session         │             ║
║   └──────────────────┘  └──────────────────┘             ║
║                                                          ║
║  Notes / incidents en cours                              ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ + Ajouter une note                                  │ ║
║  └─────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════╝
```

---

## Écran 4 — Fermeture (3 étapes)

### 4a · Recomptage

```
╔══════════════════════════════════════════════════════════╗
║  ← Fermeture · Quart matin                               ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ●━━━○━━━○  1/3 · Recompter les items             ║
║                                                          ║
║  Comptez à nouveau les mêmes items qu'à l'ouverture.     ║
║  ⚠ Vous ne voyez PAS les chiffres système.              ║
║                                                          ║
║  ALCOOLS · 5 items                                       ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │  Toña 12oz                          [    18    ]    │ ║
║  │  Toña Litro                         [    8     ]    │ ║
║  │  Victoria Frost                     [    14    ]    │ ║
║  │  Flor de Caña 4 ans                 [    3     ]    │ ║
║  │  Flor de Caña 7 ans                 [    1     ]    │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║                                       [ Continuer → ]    ║
╚══════════════════════════════════════════════════════════╝
```

### 4b · Comptage cash

```
╔══════════════════════════════════════════════════════════╗
║  ← Fermeture · Quart matin                               ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ○━━━●━━━○  2/3 · Comptage du cash                ║
║                                                          ║
║  💵 Cash physique dans la caisse                         ║
║                                                          ║
║         ┌────────────────────────────┐                   ║
║         │  C$  [   6 350.00       ]  │                   ║
║         └────────────────────────────┘                   ║
║                                                          ║
║  ▸ Détailler par coupures (optionnel)                    ║
║                                                          ║
║                          [ ← Retour ] [ Continuer → ]    ║
╚══════════════════════════════════════════════════════════╝
```

---

## Écran 5 — Réconciliation (cœur du système)

### Cas A · tout balance ✅

```
╔══════════════════════════════════════════════════════════╗
║  Fermeture · Quart matin                                 ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ○━━━○━━━●  3/3 · Réconciliation                  ║
║                                                          ║
║         ┌────────────────────────────────────┐           ║
║         │     ✅                              │           ║
║         │                                    │           ║
║         │   Tout balance !                   │           ║
║         │                                    │           ║
║         │   Caisse + Stock conformes         │           ║
║         └────────────────────────────────────┘           ║
║                                                          ║
║  💰 Caisse           ✓ Conforme                          ║
║  📦 Stock            ✓ 12/12 items conformes             ║
║                                                          ║
║                          [ Confirmer la fermeture ✓ ]    ║
╚══════════════════════════════════════════════════════════╝
```

### Cas B · écarts détectés ⚠️ avec suggestion

```
╔══════════════════════════════════════════════════════════╗
║  Fermeture · Quart matin                                 ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Étape ○━━━○━━━●  3/3 · Réconciliation                  ║
║                                                          ║
║  ⚠️  Des écarts ont été détectés                         ║
║                                                          ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 💰 CAISSE                            +750 C$        │ ║
║  │                                       (surplus)     │ ║
║  │ Attendu: 6 350 · Compté: 7 100                      │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ 📦 STOCK · 2 écarts                                 │ ║
║  │                                                     │ ║
║  │  • Toña 12oz          manque 3 unités  (-225 C$)    │ ║
║  │  • Victoria Frost     manque 2 unités  (-180 C$)    │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  💡 SUGGESTION AUTOMATIQUE                               ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ ✨ Le surplus caisse (+750 C$) correspond           │ ║
║  │    approximativement aux items manquants            │ ║
║  │    (~405 C$). Une partie pourrait être :            │ ║
║  │                                                     │ ║
║  │    → Ventes non enregistrées au POS                 │ ║
║  │    → Pourboires laissés en caisse                   │ ║
║  │                                                     │ ║
║  │  Que voulez-vous faire ?                            │ ║
║  │                                                     │ ║
║  │  [🔄 Recompter les items]  [📝 Expliquer l'écart]   │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║                                  [ Confirmer quand même ]║
╚══════════════════════════════════════════════════════════╝
```

### Modal · Expliquer l'écart

```
   ┌────────────────────────────────────────────┐
   │  Expliquer les écarts                   ✕  │
   ├────────────────────────────────────────────┤
   │                                            │
   │  Catégorie principale                      │
   │  ○ Vente non enregistrée au POS            │
   │  ○ Pourboire / propina                     │
   │  ○ Casse / perte / vol                     │
   │  ○ Erreur de comptage initial              │
   │  ○ Autre                                   │
   │                                            │
   │  Détails                                   │
   │  ┌──────────────────────────────────────┐  │
   │  │                                      │  │
   │  │                                      │  │
   │  └──────────────────────────────────────┘  │
   │                                            │
   │              [ Annuler ] [ Enregistrer ]   │
   └────────────────────────────────────────────┘
```

---

## Écran 6 — Détail session (vue ADMIN, chiffres complets)

```
╔══════════════════════════════════════════════════════════╗
║  ← Quart matin · 8 mai · Maria → Carlos          ⚠️      ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  ┌──────────────────────────────────────────────────────┐║
║  │ Ouverture: 08:15 (Maria)  · Fermeture: 14:32 (Carlos)│║
║  │ Durée: 6h 17min · 23 ventes (4 350 C$)               │║
║  └──────────────────────────────────────────────────────┘║
║                                                          ║
║  💰 RÉCONCILIATION CAISSE                                ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Fond initial             2 000 C$                   │ ║
║  │ + Ventes CASH            4 350 C$                   │ ║
║  │ = Cash attendu           6 350 C$                   │ ║
║  │ Cash compté              7 100 C$                   │ ║
║  │ ─────────────────────────────────                   │ ║
║  │ ÉCART                  +  750 C$  (surplus) ⚠       │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📦 RÉCONCILIATION STOCK · 12 items                      ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Item            Ouv. Vendu Att. Compté Écart  🔁    │ ║
║  │ Toña 12oz        24    3    21    18    -3 ⚠  ×2   │ ║
║  │ Toña Litro        8    0     8     8     0 ✓  ×0   │ ║
║  │ Victoria Frost   18    2    16    14    -2 ⚠  ×3   │ ║
║  │ Flor 4 ans        3    0     3     3     0 ✓  ×0   │ ║
║  │ Flor 7 ans        1    0     1     1     0 ✓  ×0   │ ║
║  │ Pollo entier      6    2     4     4     0 ✓  ×1   │ ║
║  │ ...                                                 │ ║
║  │                                                     │ ║
║  │ 🔁 = nb de recomptages effectués par l'employé      │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  💡 ANALYSE                                              ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Items manquants × prix vente: 405 C$                │ ║
║  │ Surplus caisse:               750 C$                │ ║
║  │ Différence inexpliquée:       345 C$                │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📝 NOTE EMPLOYÉ (Carlos, 14:30)                         ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ "Vente non enregistrée — un client est venu pendant │ ║
║  │  la panne d'internet de 11h, payé cash."            │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║                           [ Marquer comme résolu ✓ ]    ║
╚══════════════════════════════════════════════════════════╝
```

---

## Écran 7 — Détail session (vue EMPLOYÉ, sans chiffres)

```
╔══════════════════════════════════════════════════════════╗
║  ← Quart matin · 8 mai                            ⚠️     ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Statut: Fermée à 14:32                                  ║
║  Ouverte par Maria · Fermée par vous (Carlos)            ║
║                                                          ║
║  💰 Caisse:    ⚠ Écart détecté                           ║
║  📦 Stock:     2 écarts sur 12 items                     ║
║                                                          ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │  Items                                              │ ║
║  │  ✓ Toña Litro              Conforme                 │ ║
║  │  ⚠ Toña 12oz               Écart                    │ ║
║  │  ⚠ Victoria Frost          Écart                    │ ║
║  │  ✓ Flor de Caña 4 ans      Conforme                 │ ║
║  │  ✓ Flor de Caña 7 ans      Conforme                 │ ║
║  │  ✓ Pollo entier            Conforme                 │ ║
║  │  ...                                                │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  ℹ L'admin a été notifié et examinera les écarts.        ║
╚══════════════════════════════════════════════════════════╝
```

---

## Écran 8 — Config admin (items à compter)

```
╔══════════════════════════════════════════════════════════╗
║  ← Items à compter à chaque session                      ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  Sélectionnez les produits à compter à l'ouverture       ║
║  et fermeture de chaque quart.                           ║
║                                                          ║
║  💡 Conseil: cochez les produits à risque (alcool,       ║
║     viande, articles chers) — pas tout l'inventaire.     ║
║                                                          ║
║  [🔍 Rechercher...]    Filtrer: [Toutes catégories ▾]    ║
║                                                          ║
║  ALCOOLS                          [ Tout cocher ]        ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ ☑ Toña 12oz                                         │ ║
║  │ ☑ Toña Litro                                        │ ║
║  │ ☑ Victoria Frost                                    │ ║
║  │ ☑ Flor de Caña 4 ans                                │ ║
║  │ ☑ Flor de Caña 7 ans                                │ ║
║  │ ☐ Coca-Cola 600ml                                   │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  VIANDES                          [ Tout cocher ]        ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ ☑ Pollo entier                                      │ ║
║  │ ☑ Carne molida                                      │ ║
║  │ ☑ Chorizo                                           │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  ÉPICERIE                         [ Tout cocher ]        ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ ☐ Riz 1lb                                           │ ║
║  │ ☐ Haricots noirs                                    │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  💾 12 items sélectionnés          [ Sauvegarder ]       ║
╚══════════════════════════════════════════════════════════╝
```

---

## Schéma BD (3 tables + 1 colonne)

```sql
-- Sur la table products existante
ALTER TABLE products ADD COLUMN track_in_count BOOLEAN DEFAULT FALSE;

-- Sessions de caisse (un quart = une session)
cash_sessions
  id, tenant_id, name (ex: "Quart matin"),
  status (OPEN/CLOSED), opening_cash, closing_cash,
  opened_at, opened_by_id, closed_at, closed_by_id,
  opening_method (COUNTED | CARRIED_OVER),  -- CARRIED_OVER = reprise du closing du même employé
  previous_session_id (FK, nullable),       -- session reprise (pour audit)
  notes, resolved (BOOLEAN, admin)

-- Employés rattachés à la session (multi-employés)
cash_session_employees
  session_id, employee_id

-- Comptages d'items (1 ligne = 1 produit, opening + closing)
cash_session_counts
  id, session_id, product_id, variant_id,
  product_name, sku,
  opening_qty, closing_qty,
  expected_closing_qty (calculé à la fermeture),
  recount_attempts INT DEFAULT 0,   -- nb de fois où la valeur closing_qty a été modifiée
  notes

-- Historique des recomptages (audit trail facultatif mais recommandé)
cash_session_recounts
  id, session_id,
  type (ITEM | CASH),
  count_id (FK cash_session_counts, nullable si type=CASH),
  attempt_number INT,             -- 1 = comptage initial, 2 = 1er recomptage, etc.
  previous_value NUMERIC,
  new_value NUMERIC,
  recounted_by_id, recounted_at
```

> **Note recomptages** : à la fermeture, si la valeur saisie crée un écart, l'employé peut cliquer **"Recompter"** sur la ligne. Chaque recomptage incrémente `recount_attempts` et insère une ligne dans `cash_session_recounts`. Idem pour le total cash (`type=CASH`, `count_id=NULL`).

---

## Logique de réconciliation

### Pour chaque item compté

```
Stock attendu = Compté ouverture − Quantité vendue (POS)
Écart item    = Stock attendu − Compté fermeture
```

### Pour la caisse

```
Cash attendu = Fond initial + Ventes CASH du quart
Écart cash   = Cash compté − Cash attendu
```

### Suggestion intelligente (à la fermeture)

- `surplusCash = closing_cash − (opening_cash + ventesCash)`
- `valeurItemsManquants = Σ (écart_item × prix_vente_item)` (items en déficit)
- Si `|surplusCash − valeurItemsManquants| < 15 %` → suggère **« ventes non enregistrées probables »**
- Si `surplusCash > 0` mais aucun item manquant → suggère **« pourboire ou erreur de change »**
- Si `surplusCash < 0` et aucun item manquant → suggère **« vol cash ou erreur de change »**

---

## 🛡️ Anti-fraude (détection des employés à risque)

Le système est conçu pour repérer les employés qui tentent de manipuler les chiffres pour voler cash ou produits.

### 1. Comptage à l'aveugle (structurel)

Pendant la fermeture, l'employé voit uniquement les cases à remplir — **jamais la valeur attendue** ni les ventes du quart. Le système calcule l'écart **après** soumission.
- Empêche d'« ajuster » son comptage pour matcher l'attendu
- Si l'employé recompte, on garde `previous_value` pour vérifier que la correction est plausible (pas systématiquement orientée vers 0)

### 2. Tracking des recomptages

Déjà couvert par `cash_session_recounts` :
- `recount_attempts` par item visible côté admin (colonne 🔁)
- Pattern suspect : si `previous_value` est toujours « ajustée vers l'attendu » après que l'écart soit révélé → flag rouge
- **Verrouillage après 3 recomptages** sur un même item → admin doit débloquer

### 3. Note obligatoire si écart > seuil

Dès qu'un écart dépasse le seuil toléré (cash ou item), une **note explicative est obligatoire** avant de pouvoir clôturer. Force l'employé à fournir une explication traçable et datée.

### 4. Score de risque par employé

Calculé sur 30 jours glissants, visible sur `/dashboard/cash-sessions/insights` :
- Nb moyen de recomptages / session
- Fréquence d'écarts négatifs (déficit cash ou stock)
- Taille moyenne des écarts en C$
- Ratio écart négatif / écart positif (un employé honnête a ~50/50 ; un voleur penche vers les déficits)

### 5. Tracking des actions POS sensibles

À agréger par `cash_session_id` :
- **Annulations / voids** par employé
- **Remises manuelles** (montant + fréquence)
- **Ouvertures de tiroir sans vente** (no-sale)
- **Ratio paiement cash vs carte** comparé à la moyenne des autres employés

### 6. Heatmap écarts × produit × employé

Vue admin : matrice qui révèle les patterns (ex: « Maria a toujours des écarts négatifs sur les bouteilles d'alcool premium »).

### 7. Visibilité côté employé (dissuasion)

Sur le dashboard de l'employé, afficher son propre score de précision :
> « Précision: 94% · 3 sessions avec écarts ce mois »

L'effet psychologique seul réduit la fraude.

### 8. Tableau de bord admin `/dashboard/cash-sessions/insights`

```
╔══════════════════════════════════════════════════════════╗
║  Insights · Sessions de caisse · 30 derniers jours       ║
║──────────────────────────────────────────────────────────║
║                                                          ║
║  ⚠️  EMPLOYÉS À SURVEILLER                                ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Carlos    Score risque: 78 ↑    Écart cumul: -2 340 │ ║
║  │           12 recomptages / 18 sessions               │ ║
║  │ Maria     Score risque: 31 →    Écart cumul:   -180 │ ║
║  │ Ana       Score risque:  8 ↓    Écart cumul:    +45 │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📦 PRODUITS LES PLUS EN ÉCART                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Flor de Caña 7 ans    -23 unités    1 380 C$        │ ║
║  │ Toña 12oz             -47 unités      940 C$        │ ║
║  │ ...                                                 │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📈 ÉVOLUTION DES ÉCARTS                                 ║
║  [graphique ligne — écart cumulé / jour]                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### 9. (Optionnel, plus tard) Comptage croisé aléatoire

1 session sur N (configurable), le système demande à un 2ᵉ employé de recompter 2-3 items au hasard. Crée une vérification indépendante peu coûteuse.

### Ajouts au schéma BD pour anti-fraude

```sql
-- Tracker les actions POS sensibles par session
ALTER TABLE transactions ADD COLUMN cash_session_id UUID REFERENCES cash_sessions(id);
ALTER TABLE transactions ADD COLUMN voided_by_id UUID;       -- si annulée
ALTER TABLE transactions ADD COLUMN voided_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN void_reason TEXT;

-- Événements "no-sale" (ouverture tiroir sans vente)
cash_drawer_events
  id, tenant_id, cash_session_id,
  type (NO_SALE | VOID | LARGE_DISCOUNT),
  employee_id, amount, reason, created_at

-- Score employé matérialisé (rebuild quotidien)
employee_risk_scores
  employee_id, tenant_id,
  period_start, period_end,
  total_sessions, total_recounts,
  total_negative_variance, total_positive_variance,
  variance_ratio,           -- neg / (neg + pos)
  voids_count, no_sales_count, large_discounts_count,
  risk_score INT,           -- 0-100
  trend (UP | STABLE | DOWN),
  computed_at
```

---

## Décisions (suite)

5. **Wireframes** : ✅ validés
6. **Détail par coupures** au comptage cash : ❌ superflu — un seul champ "total cash compté"
7. **Authentification employés du quart** : simple cochage — celui qui ouvre indique qui était présent (pas de login individuel)
8. **Changement de quart** (Maria → Carlos) : pas de nouvelle session automatique. La session reste ouverte, mais **l'employé qui effectue le comptage de fermeture doit s'identifier** (sélection obligatoire dans la liste des employés du quart, ou ajout à la volée si absent)

### Implications UX

- Écran d'ouverture : **liste de checkboxes** des employés actifs → pas de mot de passe
- Écran de fermeture : **« Qui fait le comptage ? »** = dropdown obligatoire (employés du quart + bouton « ajouter un employé »), enregistré dans `closed_by_id`
- Comptage cash : **1 seul champ numérique** "Total cash compté" (pas de ventilation par billets)

## Questions ouvertes restantes

1. **Seuil d'écart toléré** (en C$ ou %) sous lequel la session est marquée ✅ même avec petit écart ?
2. Sessions **non fermées** (oubli) : auto-close à minuit ? notification admin ? rien ?

---

## Prochaines étapes

- [x] Valider les wireframes
- [ ] Trancher les 2 questions restantes (seuil d'écart + sessions oubliées)
- [ ] Migration SQL (3 tables + colonne `track_in_count`)
- [ ] API routes (`/api/tenants/[tenantId]/cash-sessions/...`)
- [ ] Page config admin (items à compter)
- [ ] Pages session : liste, ouverture, fermeture, détail
- [ ] Intégration POS → tagger les ventes par `cash_session_id` pour la réconciliation
