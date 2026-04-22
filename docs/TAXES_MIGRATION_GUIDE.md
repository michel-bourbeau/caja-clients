# Guide de Migration - Système de Taxes Flexible

## 📋 Résumé des Modifications

Le système de taxes a été complètement restructuré pour permettre aux clients de configurer leurs propres taxes plutôt que d'utiliser une IVA hardcodée à 21%.

### Fichiers Modifiés:
- ✅ `src/app/dashboard/pos/page.tsx` - Intégration des taxes dynamiques
- ✅ `src/components/Sidebar.tsx` - Lien vers les paramètres de taxes
- ✅ `src/features/taxes/services.ts` - Service de gestion des taxes (NOUVEAU)

### Fichiers Créés Précédemment:
- ✅ `src/app/api/tenants/[tenantId]/taxes/route.ts` - API GET/POST
- ✅ `src/app/api/tenants/[tenantId]/taxes/[taxId]/route.ts` - API PUT/DELETE
- ✅ `src/app/dashboard/settings/taxes/page.tsx` - UI de configuration
- ✅ `docs/sql/create_tenant_taxes_table.sql` - Schéma de base de données

## 🔧 Étapes de Migration

### Étape 1: Exécuter la Migration de Base de Données

1. Ouvrez [Supabase Dashboard](https://supabase.com) et connectez-vous à votre projet
2. Allez à **SQL Editor** (icône SQL en bas à gauche)
3. Cliquez sur **Create a new query**
4. Copiez et collez le contenu de `docs/sql/create_tenant_taxes_table.sql`
5. Cliquez sur **Run** (ou Ctrl+Enter)

**SQL Script à exécuter:**
```sql
-- Create tenant_taxes table
CREATE TABLE IF NOT EXISTS tenant_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_taxes_tenant_id ON tenant_taxes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_taxes_is_active ON tenant_taxes(tenant_id, is_active);

-- Enable RLS for security
ALTER TABLE tenant_taxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for tenant members" ON tenant_taxes
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant')::uuid OR
    auth.uid() IN (
      SELECT user_id FROM tenant_members WHERE tenant_id = current_setting('app.current_tenant')::uuid
    )
  );

CREATE POLICY "Enable write access for tenant admins" ON tenant_taxes
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM tenant_members 
      WHERE tenant_id = current_setting('app.current_tenant')::uuid AND role = 'admin'
    )
  );
```

✅ **Vérification**: Vous devriez voir "Success" et la table `tenant_taxes` apparaîtra dans la liste des tables dans Supabase.

### Étape 2: Tester l'Application

1. Arrêtez le serveur de développement (Ctrl+C)
2. Redémarrez-le: `npm run dev`
3. Navigez vers http://localhost:3000
4. Connectez-vous avec vos identifiants
5. Allez à **Admin > Impuestos** (dans le Sidebar)

### Étape 3: Configurer les Taxes

1. Cliquez sur **Agregar Impuesto** (Add Tax)
2. Entrez le nom du tax (ex: "IVA", "TVA", "GST")
3. Entrez le taux en pourcentage (ex: 21 pour 21%)
4. Cliquez sur **Agregar** (Add)
5. Les taxes apparaîtront dans la liste
6. Vous pouvez **Editar** (Edit), **Cambiar Estado** (Toggle), ou **Eliminar** (Delete)

### Étape 4: Vérifier dans la Venta

1. Allez à **Cajas > Nueva Venta** (New Sale)
2. Ajoutez quelques produits au panier
3. Dans la section "Résumé de Vente", vous devriez voir:
   - **Subtotal** - Prix avant taxes
   - **Chaque taxe configurée** avec le taux et le montant (ex: "IVA (21%) - €100.00")
   - **Total** - Prix final incluant toutes les taxes

### Étape 5: Tester les Cas Limites

**Sans taxes configurées:**
- Vous verrez un message: "Aucune taxe configurée. Configurer les taxes"
- Le Total = Subtotal (pas de taxes appliquées)

**Avec taxes inactives:**
- Les taxes inactives ne s'affichent pas
- Seules les taxes actives sont utilisées

## 📊 Cas d'Utilisation

### Exemple 1: Single Tax (IVA à 21%)
```
Panier:
- Produit 1: €100
- Produit 2: €50
Subtotal: €150
IVA (21%): €31.50
Total: €181.50
```

### Exemple 2: Multiple Taxes (TVA + Écotaxe)
```
Panier:
- Produit: €100
Subtotal: €100
TVA (20%): €20.00
Écotaxe (2%): €2.00
Total: €122.00
```

### Exemple 3: No Taxes
```
Panier:
- Produit: €100
Subtotal: €100
[Aucune taxe configurée]
Total: €100
```

## 🔍 Troubleshooting

### Problème: Page /dashboard/settings/taxes affiche "Accès refusé"

**Solution**: L'utilisateur doit avoir la permission `manage_settings`.
1. Allez à **Admin > Gestionar Roles**
2. Sélectionnez le rôle de l'utilisateur
3. Cochez la permission **manage_settings**
4. Rafraîchissez la page

### Problème: Les taxes ne s'affichent pas dans Nueva Venta

**Solution**: Assurez-vous que:
1. Les taxes sont créées: Admin > Impuestos
2. Les taxes sont actives (bouton vert)
3. Vous avez des produits dans le panier
4. La page POS s'est rechargée après la création des taxes

### Problème: "Aucune taxe configurée" s'affiche même après création

**Solution**: Rafraîchissez la page POS ou videz le cache du navigateur (F12 > Application > Clear All).

## 📝 Notes Techniques

### Architecture:

```
Taxes System
├── API Endpoints
│   ├── GET /api/tenants/[tenantId]/taxes
│   ├── POST /api/tenants/[tenantId]/taxes
│   ├── PUT /api/tenants/[tenantId]/taxes/[taxId]
│   └── DELETE /api/tenants/[tenantId]/taxes/[taxId]
│
├── Services
│   └── src/features/taxes/services.ts
│       ├── fetchTaxes() - Récupère les taxes actives
│       └── calculateTaxes() - Calcule les montants par taxe
│
├── UI Pages
│   ├── /dashboard/settings/taxes - Configuration
│   └── /dashboard/pos - Affichage dans le panier
│
└── Database
    └── tenant_taxes table
        ├── Unique constraint sur (tenant_id, name)
        ├── RLS policies pour isolation des tenants
        └── Indexes pour performance
```

### Calcul des Taxes:

```javascript
// Pour chaque taxe:
taxAmount = (subtotal * taxRate) / 100
total = subtotal + sum(all taxAmounts)
```

### Validation:

- **name**: Requis, max 100 caractères
- **rate**: Requis, décimal 0.00 à 999.99%
- **is_active**: Booléen (true par défaut)
- **Duplicate check**: Pas deux taxes avec le même nom par tenant

## ✅ Vérification Post-Migration

Exécutez cette requête SQL pour vérifier l'installation:

```sql
-- Vérifier que la table existe
SELECT tablename FROM pg_tables WHERE tablename = 'tenant_taxes';

-- Vérifier les colonnes
\d tenant_taxes

-- Vérifier les RLS policies
SELECT * FROM pg_policies WHERE tablename = 'tenant_taxes';

-- Vérifier les indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'tenant_taxes';
```

## 🚀 Prochaines Étapes

- [ ] Exécuter la migration SQL
- [ ] Tester la configuration des taxes
- [ ] Tester l'affichage dans Nueva Venta
- [ ] Former les utilisateurs sur la configuration
- [ ] Documenter les tax rates par pays/région

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifiez que la table `tenant_taxes` existe dans Supabase
2. Vérifiez que les RLS policies sont activées
3. Videz le cache du navigateur
4. Rafraîchissez la page d'application
