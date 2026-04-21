"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { useCurrency } from "@/lib/utils/useCurrency";

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

/**
 * Generate SKU from product name
 * Example: "Chocolat noir 70%" -> "CHOC-NOIR-70-XYZ123"
 */
function generateSKU(name: string): string {
  if (!name.trim()) return "";

  // Take first letters of each word, uppercase, remove special chars
  const words = name.trim().split(/\s+/).slice(0, 3); // First 3 words max
  const prefix = words
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .replace(/[^A-Z0-9]/g, "");

  // Add timestamp suffix for uniqueness (short format)
  const timestamp = Date.now().toString().slice(-5);
  
  return `${prefix}-${timestamp}`;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const router = useRouter();
  const { fmt } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

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
    if (!user.permissions?.includes("inventory.view")) {
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

    if (!tenantId) {
      setMessage("Erreur: Tenant ID non trouvé. Reconnectez-vous.");
      return;
    }

    try {
      const url = `/api/tenants/${tenantId}/categories`;
      console.log("POST to:", url);
      
      const res = await fetch(url, {
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
        setMessage(error.error || `Erreur: ${res.status}`);
        console.error("Error response:", error);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage(`Erreur réseau: ${error instanceof Error ? error.message : "unknown"}`);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.sku.trim() || !newProduct.price) {
      setMessage("Remplissez tous les champs obligatoires");
      return;
    }

    try {
      // Convert string values to proper types
      const productData = {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim(),
        price: parseFloat(newProduct.price as string),
        quantity: newProduct.quantity ? parseInt(newProduct.quantity as string) : 0,
        category_id: newProduct.category_id || null,
        description: newProduct.description?.trim() || null,
      };

      console.log("Sending product data:", productData);

      const res = await fetch(`/api/tenants/${tenantId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
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
        const text = await res.text();
        console.error("Response text:", text);
        try {
          const error = JSON.parse(text);
          setMessage(error.error || `Erreur: ${res.status}`);
          console.error("Error response:", error);
        } catch {
          setMessage(`Erreur serveur: ${res.status} - ${text}`);
          console.error("Non-JSON response:", text);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage(`Erreur réseau: ${error instanceof Error ? error.message : "unknown"}`);
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

  const handleUpdateQuantity = async (productId: string, newQuantity: string) => {
    if (!newQuantity || isNaN(parseInt(newQuantity))) {
      setMessage("Veuillez entrer une quantité valide");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: parseInt(newQuantity) }),
      });

      if (res.ok) {
        setMessage("Stock mis à jour avec succès");
        setEditingProductId(null);
        setEditingQuantity("");
        await fetchData();
      } else {
        const error = await res.json();
        setMessage(error.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      setMessage("Erreur réseau");
      console.error(error);
    }
  };

  const filteredProducts = useMemo(() => {
    let list = filterCategory
      ? products.filter((p) => p.category_id === filterCategory)
      : products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterCategory, search]);

  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-sm text-slate-600 mt-1">{products.length} producto{products.length !== 1 ? "s" : ""} en inventario</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddCategory(!showAddCategory)} className="bg-blue-600 hover:bg-blue-700">
            + Categoría
          </Button>
          <Button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-green-600 hover:bg-green-700">
            + Producto
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="bg-white rounded-lg border-2 border-blue-400 shadow-sm p-5">
          <h2 className="font-semibold mb-4 text-slate-900 text-base">Nueva Categoría</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre"
              placeholder="Ej: Electrónica"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Input
              label="Descripción"
              placeholder="Descripción opcional"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700 text-white">Crear</Button>
            <Button onClick={() => setShowAddCategory(false)} className="bg-slate-200 text-slate-700 hover:bg-slate-300">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Add Product Form */}
      {showAddProduct && (
        <div className="bg-white rounded-lg border-2 border-green-400 shadow-sm p-5">
          <h2 className="font-semibold mb-4 text-slate-900 text-base">Nuevo Producto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input
              label="Nombre *"
              placeholder="Nombre del producto"
              value={newProduct.name}
              onChange={(e) => {
                const newName = e.target.value;
                setNewProduct({ ...newProduct, name: newName, sku: generateSKU(newName) });
              }}
            />
            <Input
              label="SKU *"
              placeholder="Generado automáticamente"
              value={newProduct.sku}
              readOnly
              className="bg-slate-50 cursor-not-allowed opacity-75"
              title="El SKU se genera automáticamente a partir del nombre"
            />
            <Input
              label="Precio *"
              type="number"
              placeholder="Precio unitario"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
            />
            <Input
              label="Cantidad"
              type="number"
              placeholder="Stock inicial"
              value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                value={newProduct.category_id}
                onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sin categoría —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Descripción"
              placeholder="Descripción opcional"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddProduct} className="bg-green-600 hover:bg-green-700 text-white">Agregar</Button>
            <Button onClick={() => setShowAddProduct(false)} className="bg-slate-200 text-slate-700 hover:bg-slate-300">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o descripción..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="__none__">Sin categoría</option>
          </select>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500">Cargando...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-12 text-center text-gray-400">
            {products.length === 0
              ? "Ningún producto. Comience creando una categoría y agregando un producto."
              : "Sin resultados para esta búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 text-left">Producto</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">SKU</th>
                  <th className="px-4 py-2.5 text-left hidden lg:table-cell">Categoría</th>
                  <th className="px-4 py-2.5 text-right">Precio</th>
                  <th className="px-4 py-2.5 text-center">Stock</th>
                  <th className="px-4 py-2.5 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const category = categories.find((c) => c.id === product.category_id);
                  const isEditing = editingProductId === product.id;
                  return (
                    <tr key={product.id} className="group hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-slate-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="font-mono text-sm text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        {category ? (
                          <span className="inline-block px-2 py-0.5 text-sm rounded-full bg-slate-100 text-slate-600 font-medium">
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-blue-700 whitespace-nowrap">
                        {fmt(product.price)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingQuantity}
                            onChange={(e) => setEditingQuantity(e.target.value)}
                            className="w-16 px-2 py-1 border border-blue-400 rounded text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            autoFocus
                          />
                        ) : (
                          <span className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold ${
                            product.quantity <= 0
                              ? "bg-red-100 text-red-700"
                              : product.quantity <= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {product.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, editingQuantity)}
                              className="inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                              title="Guardar"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => { setEditingProductId(null); setEditingQuantity(""); }}
                              className="inline-flex items-center px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => { setEditingProductId(product.id); setEditingQuantity(product.quantity.toString()); }}
                              className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                              title="Editar stock"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="inline-flex items-center px-2.5 py-1 bg-red-100 hover:bg-red-600 hover:text-white text-red-600 text-sm font-semibold rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              {(search || filterCategory) && ` · filtrado de ${products.length}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
