# Configuration Supabase - Guide d'installation

## 1️⃣ Exécuter le schéma SQL

### Option A : Via l'interface Supabase (recommandé)

1. Va à https://app.supabase.com
2. Sélectionne ton projet `caja_database`
3. Clique sur **SQL Editor** dans le menu de gauche
4. Clique sur **New query**
5. Copie tout le contenu de `db/supabase-full-schema.sql`
6. Colle dans l'éditeur
7. Clique sur **Run**

### Option B : Via CLI (si tu as Supabase CLI)

```bash
supabase db push --local
```

## 2️⃣ Vérifier que les tables sont créées

Dans Supabase → **Table Editor**, tu devrais voir :
- ✅ tenants
- ✅ tenant_settings
- ✅ users
- ✅ products
- ✅ transactions
- ✅ employees
- ✅ payroll
- ✅ schedules
- ✅ time_entries

## 3️⃣ Configuration Row Level Security (RLS)

Les RLS sont déjà configurées dans le SQL. Les utilisateurs voient uniquement les données de leur tenant.

## 4️⃣ Tester la connexion

Exécute dans le terminal :

```bash
npm run dev
```

Va à http://localhost:3000/dashboard et la connexion Supabase devrait fonctionner.

## 5️⃣ Variables d'environnement

Le fichier `.env.local` est déjà créé avec :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Ne pousse JAMAIS `.env.local` sur GitHub** - Il est dans `.gitignore`

## 🎯 Prochaines étapes

1. Exécute le schéma SQL dans Supabase
2. Teste la page /dashboard/pos
3. Ajoute des produits dans la table products
4. Crée une transaction !
