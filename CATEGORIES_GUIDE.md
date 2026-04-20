# Système de Gestion des Produits par Catégorie

## 📋 Vue d'ensemble

Le système de gestion des produits par catégorie permet à chaque client de :
- Créer et gérer des **catégories de produits**
- Ajouter des produits avec **assignation de catégorie**
- Visualiser les produits **groupés par catégorie** dans la caisse
- Filtrer les produits lors des ventes

## 🚀 Installation

### 1. Exécuter la migration Supabase

Connectez-vous à votre [tableau de bord Supabase](https://app.supabase.com) et exécutez le SQL suivant dans l'éditeur SQL :

```sql
-- Voir le fichier: db/migrations/add_product_categories.sql
```

Ou simplement copier-coller le contenu du fichier `db/migrations/add_product_categories.sql` dans l'éditeur SQL de Supabase.

### 2. Vérifier la création des tables

Après exécution, vérifiez que les tables ont été créées :
- `product_categories` - Table des catégories
- La colonne `category_id` a été ajoutée à `products`

## 📚 API Endpoints

### Catégories

#### GET /api/tenants/[tenantId]/categories
Récupère toutes les catégories du tenant

```bash
curl http://localhost:3000/api/tenants/tenant-123/categories
```

Response:
```json
[
  {
    "id": "cat-1",
    "tenant_id": "tenant-123",
    "name": "Électronique",
    "description": "Produits électroniques et informatiques",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/tenants/[tenantId]/categories
Crée une nouvelle catégorie

```bash
curl -X POST http://localhost:3000/api/tenants/tenant-123/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobilier",
    "description": "Meubles et accessoires de bureau"
  }'
```

### Produits

#### GET /api/tenants/[tenantId]/products
Récupère tous les produits du tenant

#### POST /api/tenants/[tenantId]/products
Crée un nouveau produit

```bash
curl -X POST http://localhost:3000/api/tenants/tenant-123/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Dell XPS",
    "sku": "DELL-XPS-001",
    "price": 1299.99,
    "quantity": 5,
    "category_id": "cat-1",
    "description": "Ultrabook haute performance"
  }'
```

#### PUT /api/tenants/[tenantId]/products/[productId]
Modifie un produit existant

#### DELETE /api/tenants/[tenantId]/products/[productId]
Supprime un produit

## 🎯 Utilisation

### Page de Gestion des Inventaire

Accédez à la page d'inventaire : `http://localhost:3000/dashboard/inventory`

**Fonctionnalités :**
- ✅ **Créer une catégorie** - Bouton "+ Catégorie"
- ✅ **Ajouter un produit** - Bouton "+ Produit"
- ✅ **Assigner une catégorie** - Sélecteur lors de la création
- ✅ **Visualiser par catégorie** - Les produits sont groupés
- ✅ **Supprimer des produits** - Action par produit

### Page de Caisse (POS)

Accédez à la caisse : `http://localhost:3000/dashboard/pos` ou `http://localhost:3000/pos`

**Améliorations :**
- 🔹 **Onglets de catégorie** - Filtrez rapidement les produits
- 🔹 **Affichage organisé** - Chaque catégorie dans un onglet
- 🔹 **Compteur d'articles** - Voir combien de produits par catégorie
- 🔹 **Sélection rapide** - Cliquez sur l'onglet pour afficher les produits

## 📊 Structure de la Base de Données

### Table: product_categories
```sql
id (UUID) - Identifiant unique
tenant_id (UUID) - Référence au tenant
name (VARCHAR) - Nom de la catégorie (UNIQUE par tenant)
description (TEXT) - Description optionnelle
created_at (TIMESTAMP) - Date de création
updated_at (TIMESTAMP) - Date de modification
```

### Table: products (colonne ajoutée)
```sql
category_id (UUID) - Référence à product_categories
```

## 🔒 Sécurité

- **Row Level Security (RLS)** activée sur les catégories
- Chaque tenant ne voit que **ses propres catégories et produits**
- Les politiques RLS vérifient `tenant_id` pour chaque requête

## 🔄 Workflow Typique

1. **Créer des catégories** dans l'inventaire
   - Exemple: "Électronique", "Accessoires", "Mobilier"

2. **Ajouter des produits** et les assigner aux catégories
   - Sélectionnez la catégorie lors de la création

3. **Utiliser la caisse** avec affichage par catégorie
   - Les vendeurs voient les produits organisés par onglets

4. **Gérer les stocks** depuis l'inventaire
   - Modifier les quantités et descriptions si nécessaire

## 🐛 Dépannage

### Les catégories ne s'affichent pas
- Vérifiez que la migration SQL a été exécutée
- Confirmez que vous avez créé au moins une catégorie

### Les produits ne s'assignent pas à une catégorie
- Assurez-vous que la catégorie existe dans la même tenant
- Vérifiez que `category_id` n'est pas NULL dans la base de données

### Erreur 404 sur les endpoints
- Vérifiez que le `tenantId` est correct
- Assurez-vous que les fichiers routes existent :
  - `/src/app/api/tenants/[tenantId]/categories/route.ts`
  - `/src/app/api/tenants/[tenantId]/products/[productId]/route.ts`

## 📝 Permissions Requises

La gestion des produits nécessite la permission : `manage_products`

Pour vérifier ou ajouter cette permission, modifiez le contexte d'authentification.

## 🎨 Personnalisation

### Modifier les couleurs des onglets
Éditez [src/app/dashboard/pos/page.tsx](../src/app/dashboard/pos/page.tsx) :
```tsx
className={selectedCategory === cat.id
  ? "bg-blue-600 text-white"     // ← Couleur active
  : "bg-slate-100 text-slate-700" // ← Couleur inactive
}
```

### Ajouter des champs supplémentaires
1. Modifiez la migration SQL pour ajouter des colonnes
2. Mettez à jour les types TypeScript
3. Mettez à jour les formulaires React

---

**Dernière mise à jour :** Avril 2026
**Version :** 1.0.0
