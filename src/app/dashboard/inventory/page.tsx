"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category_id?: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    quantity: "",
    category_id: "",
    description: "",
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.permissions?.includes("manage_products")) {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [tenantId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/products`),
        fetch(`/api/tenants/${tenantId}/categories`),
      ]);

      if (productsRes.ok && categoriesRes.ok) {
        setProducts(await productsRes.json());
        setCategories(await categoriesRes.json());
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setMessage("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      setMessage("Le nom de la catégorie est requis");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (res.ok) {
        setMessage("Catégorie créée avec succès");
        setNewCategory({ name: "", description: "" });
        setShowAddCategory(false);
        await fetchData();
      } else {
        const error = await res.json();
        setMessage(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      setMessage("Erreur réseau");
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.sku.trim() || !newProduct.price) {
      setMessage("Remplissez les champs obligatoires");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        setMessage("Produit créé avec succès");
        setNewProduct({
          name: "",
          sku: "",
          price: "",
          quantity: "",
          category_id: "",
          description: "",
        });
        setShowAddProduct(false);
        await fetchData();
      } else {
        const error = await res.json();
        setMessage(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      setMessage("Erreur réseau");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Confirmer la suppression du produit?")) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Produit supprimé");
        await fetchData();
      } else {
        setMessage("Erreur lors de la suppression");
      }
    } catch (error) {
      setMessage("Erreur réseau");
    }
  };

  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestion des Produits</h1>
        <div className="space-x-2">
          <Button onClick={() => setShowAddCategory(!showAddCategory)} className="bg-blue-500">
            + Catégorie
          </Button>
          <Button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-green-500">
            + Produit
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}

      {/* Add Category Form */}
      {showAddCategory && (
        <Card className="p-4 bg-blue-50">
          <h2 className="font-bold mb-4">Nouvelle Catégorie</h2>
          <div className="space-y-3">
            <Input
              label="Nom"
              placeholder="Ex: Électronique"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="Description optionnelle"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} className="bg-blue-600 text-white">
                Créer
              </Button>
              <Button onClick={() => setShowAddCategory(false)} className="bg-gray-400">
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Product Form */}
      {showAddProduct && (
        <Card className="p-4 bg-green-50">
          <h2 className="font-bold mb-4">Nouveau Produit</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom *"
              placeholder="Nom du produit"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <Input
              label="SKU *"
              placeholder="Code SKU"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
            />
            <Input
              label="Prix *"
              type="number"
              placeholder="Prix unitaire"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
            />
            <Input
              label="Quantité"
              type="number"
              placeholder="Stock initial"
              value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={newProduct.category_id}
                onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Sans catégorie --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Description"
              placeholder="Description optionnelle"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddProduct} className="bg-green-600 text-white">
              Ajouter
            </Button>
            <Button onClick={() => setShowAddProduct(false)} className="bg-gray-400">
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* Products by Category */}
      <div className="space-y-6">
        {productsByCategory.map(
          (category) =>
            category.products.length > 0 && (
              <Card key={category.id} className="p-4">
                <h3 className="text-xl font-bold mb-4 text-blue-600">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Nom</th>
                        <th className="px-4 py-2 text-left">SKU</th>
                        <th className="px-4 py-2 text-right">Prix</th>
                        <th className="px-4 py-2 text-right">Stock</th>
                        <th className="px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.products.map((product) => (
                        <tr key={product.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{product.name}</td>
                          <td className="px-4 py-2 text-gray-600">{product.sku}</td>
                          <td className="px-4 py-2 text-right">${product.price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{product.quantity}</td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-red-500 text-white text-xs px-2 py-1"
                            >
                              Supprimer
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
        )}

        {/* Uncategorized Products */}
        {uncategorizedProducts.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xl font-bold mb-4 text-gray-600">Non catégorisés</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">SKU</th>
                    <th className="px-4 py-2 text-right">Prix</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uncategorizedProducts.map((product) => (
                    <tr key={product.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{product.name}</td>
                      <td className="px-4 py-2 text-gray-600">{product.sku}</td>
                      <td className="px-4 py-2 text-right">${product.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{product.quantity}</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-red-500 text-white text-xs px-2 py-1"
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {products.length === 0 && (
          <Card className="p-6 text-center text-gray-500">
            Aucun produit. Commencez par créer une catégorie et ajouter un produit.
          </Card>
        )}
      </div>
    </div>
  );
}

            {
              key: "price",
              label: "Precio",
              format: (value) => formatCurrency(value),
            },
            { key: "quantity", label: "Stock" },
            { key: "category", label: "Categoría" },
          ]}
          data={mockProducts}
          actions={(product) => (
            <>
              <Button size="sm" variant="secondary">
                Editar
              </Button>
              <Button size="sm" variant="danger">
                Eliminar
              </Button>
            </>
          )}
        />
      </Card>
    </div>
  );
}
