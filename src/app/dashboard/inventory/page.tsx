"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { IconButton, PageIcon, SearchInput, DashboardHeader, Dialog, DialogFooter } from "@/components";
import { Pencil, Package, Trash2 } from "lucide-react";
import { useCurrency } from "@/lib/utils/useCurrency";

interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  price: number;
  stock_quantity: number;
  min_stock?: number;
  sort_order?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category_id?: string;
  description?: string;
  min_stock?: number;
  has_variants?: boolean;
  variants?: ProductVariant[];
  sort_order?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order?: number;
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
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantQty, setEditingVariantQty] = useState<string>("");
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string>("");
  const [editingVariantMinStockId, setEditingVariantMinStockId] = useState<string | null>(null);
  const [editingVariantMinStock, setEditingVariantMinStock] = useState<string>("");
  const [editingModalVariantMinStockId, setEditingModalVariantMinStockId] = useState<string | null>(null);
  const [editingModalVariantMinStock, setEditingModalVariantMinStock] = useState<string>("");
  const [editingModalVariantQtyId, setEditingModalVariantQtyId] = useState<string | null>(null);
  const [editingModalVariantQty, setEditingModalVariantQty] = useState<string>("");
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  // Edit product modal
  const [editProductModal, setEditProductModal] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    price: "",
    quantity: "",
    min_stock: "",
    category_id: "",
    description: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    quantity: "",
    min_stock: "",
    category_id: "",
    description: "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Multi-format / variants state for add-product form
  const [isMultiFormat, setIsMultiFormat] = useState(false);
  const [variantRows, setVariantRows] = useState<{ label: string; price: string; quantity: string }[]>([
    { label: "", price: "", quantity: "" },
  ]);

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
  }, [tenantId]);

  // Auto-clear messages after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/products`),
        fetch(`/api/tenants/${tenantId}/categories`),
      ]);

      if (productsRes.ok && categoriesRes.ok) {
        let loadedProducts = await productsRes.json();
        
        // Ensure all variants have valid sort_order and are sorted correctly
        loadedProducts = loadedProducts.map((product: Product) => {
          if (product.variants && product.variants.length > 0) {
            // First pass: ensure all variants have a valid numeric sort_order
            let normalizedVariants = product.variants.map((v, idx) => {
              // Keep existing sort_order if it's a valid number
              if (typeof v.sort_order === 'number' && !isNaN(v.sort_order)) {
                return v;
              }
              // Otherwise assign index-based sort_order
              return { ...v, sort_order: idx };
            });
            
            // Second pass: ALWAYS sort by sort_order to ensure correct display order
            // This is critical because backend might return variants in any order
            normalizedVariants = normalizedVariants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            
            return { ...product, variants: normalizedVariants };
          }
          return product;
        });
        
        setProducts(loadedProducts);
        setCategories(await categoriesRes.json());
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
      setMessage("Error loading inventory");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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

  const handleUploadProductImage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "product");
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Image upload failed");
      }
      
      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("Error al subir la imagen");
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage("Por favor selecciona una imagen");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage("La imagen debe ser menor a 5MB");
        return;
      }
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.sku.trim()) {
      setMessage("El nombre y SKU son obligatorios");
      return;
    }
    if (!isMultiFormat && !newProduct.price) {
      setMessage("El precio es obligatorio");
      return;
    }
    if (isMultiFormat && variantRows.some((v) => !v.label.trim() || !v.price)) {
      setMessage("Cada formato necesita un nombre y precio");
      return;
    }

    try {
      setUploadingImage(true);
      let imageUrl: string | null = null;
      if (productImage) {
        imageUrl = await handleUploadProductImage(productImage);
      }
      setUploadingImage(false);

      const productData = {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim(),
        price: isMultiFormat ? 0 : parseFloat(newProduct.price as string),
        quantity: isMultiFormat ? 0 : (newProduct.quantity ? parseInt(newProduct.quantity as string) : 0),
        min_stock: newProduct.min_stock ? parseInt(newProduct.min_stock as string) : 0,
        category_id: newProduct.category_id || null,
        description: newProduct.description?.trim() || null,
        ...(imageUrl && { image: imageUrl }),
      };

      const res = await fetch(`/api/tenants/${tenantId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const error = JSON.parse(text);
          setMessage(error.error || `Erreur: ${res.status}`);
        } catch {
          setMessage(`Erreur serveur: ${res.status} - ${text}`);
        }
        return;
      }

      const created = await res.json();

      // If multi-format, create each variant
      if (isMultiFormat) {
        await Promise.all(
          variantRows.map((v, i) =>
            fetch(`/api/tenants/${tenantId}/products/${created.id}/variants`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                label: v.label.trim(),
                sku: `${newProduct.sku.trim().toUpperCase()}-V${i + 1}`,
                price: parseFloat(v.price),
                stock_quantity: v.quantity ? parseInt(v.quantity) : 0,
                sort_order: i,
              }),
            })
          )
        );
      }

      setMessage("Producto creado con éxito");
      setNewProduct({ name: "", sku: "", price: "", quantity: "", min_stock: "", category_id: "", description: "" });
      setProductImage(null);
      setProductImagePreview("");
      setIsMultiFormat(false);
      setVariantRows([{ label: "", price: "", quantity: "" }]);
      setShowAddProduct(false);
      await fetchData();
    } catch (error) {
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

  const handleUpdateMinStock = async (productId: string, value: string) => {
    if (value === "" || isNaN(parseInt(value))) {
      setMessage("Cantidad mínima inválida");
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_stock: parseInt(value) }),
      });
      if (res.ok) {
        setEditingMinStockId(null);
        setEditingMinStock("");
        await fetchData();
      } else {
        const err = await res.json();
        setMessage(err.error || "Error al actualizar mínimo");
      }
    } catch {
      setMessage("Error de red");
    }
  };

  const handleUpdateVariantQty = async (productId: string, variantId: string, qty: string) => {
    if (!qty || isNaN(parseInt(qty))) {
      setMessage("Quantité invalide");
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: parseInt(qty) }),
      });
      if (res.ok) {
        setMessage("Stock mis à jour");
        setEditingVariantId(null);
        setEditingVariantQty("");
        await fetchData();
      } else {
        setMessage("Erreur lors de la mise à jour");
      }
    } catch {
      setMessage("Erreur réseau");
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    if (!confirm("Supprimer ce format?")) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage("Format supprimé");
        await fetchData();
      } else {
        setMessage("Erreur suppression");
      }
    } catch {
      setMessage("Erreur réseau");
    }
  };

  const handleUpdateVariantMinStock = async (productId: string, variantId: string, minStock: string) => {
    if (!minStock || isNaN(parseInt(minStock))) {
      setMessage("Stock minimum invalide");
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_stock: parseInt(minStock) }),
      });
      if (res.ok) {
        setMessage("Stock minimum mis à jour");
        setEditingVariantMinStockId(null);
        setEditingVariantMinStock("");
        await fetchData();
      } else {
        setMessage("Erreur lors de la mise à jour");
      }
    } catch {
      setMessage("Erreur réseau");
    }
  };

  const handleReorderVariant = async (productId: string, variantId: string, direction: "up" | "down") => {
    const product = products.find(p => p.id === productId);
    if (!product?.variants) {
      console.warn("handleReorderVariant: Product or variants not found", productId);
      return;
    }
    
    // Initialize sort_order for variants that don't have one, based on their original index
    const variantsWithSortOrder = product.variants.map((v, idx) => {
      // Keep existing sort_order if it's a valid number
      if (typeof v.sort_order === 'number' && !isNaN(v.sort_order)) {
        return v;
      }
      // Otherwise assign index-based sort_order
      return { ...v, sort_order: idx };
    });
    
    // Sort variants by sort_order to get correct current position
    const sortedVariants = [...variantsWithSortOrder].sort((a, b) => a.sort_order! - b.sort_order!);
    const currentIdx = sortedVariants.findIndex(v => v.id === variantId);
    if (currentIdx === -1) {
      console.warn("handleReorderVariant: Variant not found in sorted list", variantId);
      return;
    }
    
    const newIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (newIdx < 0 || newIdx >= sortedVariants.length) {
      console.warn("handleReorderVariant: Invalid new index", { currentIdx, newIdx, length: sortedVariants.length });
      return;
    }

    const currentVariant = sortedVariants[currentIdx];
    const neighborVariant = sortedVariants[newIdx];
    
    const currentSortOrder = currentVariant.sort_order!;
    const neighborSortOrder = neighborVariant.sort_order!;
    
    console.log("🔄 Reordering variants:", {
      productId,
      currentVariantId: variantId,
      currentVariantLabel: currentVariant.label,
      neighborVariantId: neighborVariant.id,
      neighborVariantLabel: neighborVariant.label,
      direction,
      currentSortOrder,
      neighborSortOrder,
    });
    
    try {
      // Swap sort_order values
      
      // Update both variants sequentially
      const res1 = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: neighborSortOrder }),
      });
      
      if (!res1.ok) {
        const error1 = await res1.text();
        console.error("❌ Failed to update first variant:", res1.status, error1);
        setMessage(`Erreur: ${res1.status} - ${error1}`);
        return;
      }
      
      const res2 = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${neighborVariant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: currentSortOrder }),
      });
      
      if (!res2.ok) {
        const error2 = await res2.text();
        console.error("❌ Failed to update second variant:", res2.status, error2);
        setMessage(`Erreur: ${res2.status} - ${error2}`);
        return;
      }
      
      console.log("✅ Both variants updated successfully");
      
      // Update local state without reloading - swap sort_order in the products array
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          
          // Swap sort_order in the variants array
          const updatedVariants = p.variants?.map((v) => {
            if (v.id === variantId) return { ...v, sort_order: neighborSortOrder };
            if (v.id === neighborVariant.id) return { ...v, sort_order: currentSortOrder };
            return v;
          }) ?? [];
          
          return { ...p, variants: updatedVariants };
        })
      );
      
      // Also update the edit modal if it's currently open
      if ((editProductModal as any)?.id === productId) {
        setEditProductModal((prev: any) => ({
          ...prev,
          variants: prev.variants?.map((v: ProductVariant) => {
            if (v.id === variantId) return { ...v, sort_order: neighborSortOrder };
            if (v.id === neighborVariant.id) return { ...v, sort_order: currentSortOrder };
            return v;
          }) ?? [],
        }));
      }
      
      setMessage("Format réordonné");
    } catch (error) {
      console.error("❌ Network error:", error);
      setMessage(`Erreur réseau: ${error instanceof Error ? error.message : "unknown"}`);
    }
  };

  const openEditModal = (product: Product) => {
    setEditProductModal(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity: String(product.quantity),
      min_stock: String((product as any).min_stock ?? 0),
      category_id: product.category_id ?? "",
      description: product.description ?? "",
    });
    setEditImage(null);
    setEditImagePreview((product as any).image ?? "");
  };

  const handleEditProduct = async () => {
    if (!editProductModal) return;
    if (!editForm.name.trim()) {
      setMessage("El nombre es obligatorio");
      return;
    }
    setEditSaving(true);
    setUploadingEditImage(true);
    try {
      let imageUrl: string | null = null;
      if (editImage) {
        imageUrl = await handleUploadProductImage(editImage);
      }
      setUploadingEditImage(false);

      const updateData: any = {
        name: editForm.name.trim(),
        sku: editForm.sku.trim(),
        price: parseFloat(editForm.price) || 0,
        quantity: parseInt(editForm.quantity) || 0,
        min_stock: parseInt(editForm.min_stock) || 0,
        category_id: editForm.category_id || null,
        description: editForm.description.trim() || null,
      };
      if (imageUrl) {
        updateData.image = imageUrl;
      }

      const res = await fetch(`/api/tenants/${tenantId}/products/${editProductModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        setMessage("Producto actualizado con éxito");
        setEditProductModal(null);
        await fetchData();
      } else {
        const err = await res.json();
        setMessage(err.error || "Error al guardar");
      }
    } catch {
      setMessage("Error de red");
    } finally {
      setEditSaving(false);
      setUploadingEditImage(false);
      setEditImage(null);
    }
  };

  const moveCategory = async (catId: string, direction: -1 | 1) => {
    const idx = categories.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= categories.length) return;
    const updated = [...categories];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    const withOrder = updated.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(withOrder);
    setSavingOrder(true);
    try {
      await fetch(`/api/tenants/${tenantId}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: withOrder.map((c) => ({ id: c.id, sort_order: c.sort_order })) }),
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const moveProduct = async (productId: string, catId: string | undefined, direction: -1 | 1) => {
    const group = products.filter((p) => (p.category_id ?? null) === (catId ?? null));
    const idx = group.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= group.length) return;
    const updated = [...group];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    const withOrder = updated.map((p, i) => ({ ...p, sort_order: i }));
    setProducts((prev) => {
      const others = prev.filter((p) => (p.category_id ?? null) !== (catId ?? null));
      return [...others, ...withOrder];
    });
    setSavingOrder(true);
    try {
      await fetch(`/api/tenants/${tenantId}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: withOrder.map((p) => ({ id: p.id, sort_order: p.sort_order })) }),
      });
    } finally {
      setSavingOrder(false);
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
    return [...list].sort((a, b) => {
      // Group by category sort_order first
      const catA = categories.find((c) => c.id === a.category_id);
      const catB = categories.find((c) => c.id === b.category_id);
      const catOrderA = catA?.sort_order ?? -1;
      const catOrderB = catB?.sort_order ?? -1;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      // Then by product sort_order within category
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [products, categories, filterCategory, search]);

  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);

  return (
    <Container>
      <Section>

      {/* Edit product modal */}
      <Dialog
        isOpen={!!editProductModal}
        title="Editar Producto"
        onClose={() => { setEditProductModal(null); setEditingModalVariantQtyId(null); setEditingModalVariantQty(""); setEditingModalVariantMinStockId(null); setEditingModalVariantMinStock(""); }}
        maxWidth="md"
        footer={
          <div className="flex justify-end">
            <Button
              onClick={handleEditProduct}
              disabled={editSaving || uploadingEditImage}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              {editSaving || uploadingEditImage ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nombre del producto"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">SKU</label>
                  <input
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    placeholder="Código único"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Precio</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="Precio unitario"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sin categoría —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                {editProductModal && !(editProductModal as any).has_variants && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock actual</label>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      placeholder="Cantidad en stock"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {editProductModal && !(editProductModal as any).has_variants && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock mínimo</label>
                    <input
                      type="number"
                      value={editForm.min_stock}
                      onChange={(e) => setEditForm({ ...editForm, min_stock: e.target.value })}
                      placeholder="Alerta bajo inventario"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-0.5">Se alertará cuando el stock llegue a este número</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descripción opcional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Variants section */}
              {editProductModal && (editProductModal as any).has_variants && (editProductModal as any).variants && (editProductModal as any).variants.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Gestionar Formatos</h3>
                  <div className="space-y-2">
                    {((editProductModal as any).variants as ProductVariant[])
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((variant: ProductVariant, idx: number, sortedArray: ProductVariant[]) => (
                      <div key={variant.id} className="bg-white border border-purple-100 rounded p-3 flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{variant.label}</p>
                          <p className="text-xs text-slate-500">SKU: {variant.sku} · ${variant.price}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Stock: <span className={`font-semibold ${variant.stock_quantity <= 0 ? 'text-red-600' : 'text-green-600'}`}>{variant.stock_quantity}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {/* Stock actual */}
                          {editingModalVariantQtyId === variant.id ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editingModalVariantQty}
                                onChange={(e) => setEditingModalVariantQty(e.target.value)}
                                className="w-14 px-2 py-1 border border-purple-300 rounded text-sm text-slate-900"
                                placeholder="Stk"
                                min="0"
                              />
                              <button
                                onClick={() => handleUpdateVariantQty((editProductModal as any).id, variant.id, editingModalVariantQty)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                              >✓</button>
                              <button
                                onClick={() => { setEditingModalVariantQtyId(null); setEditingModalVariantQty(""); }}
                                className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingModalVariantQtyId(variant.id); setEditingModalVariantQty(String(variant.stock_quantity ?? 0)); }}
                              title="Editar stock"
                              className="px-2 py-1 bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-600 text-xs font-semibold rounded"
                            >
                              Editar
                            </button>
                          )}
                          
                          {/* Stock mínimo */}
                          {editingModalVariantMinStockId === variant.id ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editingModalVariantMinStock}
                                onChange={(e) => setEditingModalVariantMinStock(e.target.value)}
                                className="w-14 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Mín"
                              />
                              <button
                                onClick={() => handleUpdateVariantMinStock((editProductModal as any).id, variant.id, editingModalVariantMinStock)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                              >✓</button>
                              <button
                                onClick={() => { setEditingModalVariantMinStockId(null); setEditingModalVariantMinStock(""); }}
                                className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingModalVariantMinStockId(variant.id); setEditingModalVariantMinStock(String(variant.min_stock ?? 0)); }}
                              title="Editar stock mínimo"
                              className="px-2 py-1 bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-semibold rounded"
                            >
                              Mín: {variant.min_stock ?? 0}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Reorder buttons */}
                          <button
                            onClick={() => handleReorderVariant((editProductModal as any).id, variant.id, "up")}
                            disabled={idx === 0}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded"
                            title="Subir"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleReorderVariant((editProductModal as any).id, variant.id, "down")}
                            disabled={idx === sortedArray.length - 1}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded"
                            title="Bajar"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen del producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith("image/")) {
                        setMessage("Por favor selecciona una imagen");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setMessage("La imagen debe ser menor a 5MB");
                        return;
                      }
                      setEditImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG (máx 5MB)</p>
              </div>
            {editImagePreview && (
              <div className="mt-4 flex items-center gap-3">
                <img
                  src={editImagePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                />
                <button
                  onClick={() => {
                    setEditImage(null);
                    setEditImagePreview("");
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Eliminar imagen
                </button>
              </div>
            )}
      </Dialog>

      {/* Header */}
      <DashboardHeader 
        pageType="inventory" 
        title="Gestión de Productos"
        subtitle={`${products.length} producto${products.length !== 1 ? "s" : ""} en inventario`}
      >
        <Button
          variant={reorderMode ? "danger" : "secondary"}
          onClick={() => setReorderMode((v) => !v)}
        >
          {reorderMode ? "✓ Salir orden" : "↕ Ordenar"}
        </Button>
        <Button variant="primary" onClick={() => setShowAddCategory(true)}>
          + Categoría
        </Button>
        <Button variant="primary" onClick={() => setShowAddProduct(true)}>
          + Producto
        </Button>
      </DashboardHeader>

      {message && (
        <Alert variant="success" title="Mensaje">
          {message}
        </Alert>
      )}

      {/* Add Category Dialog */}
      <Dialog
        isOpen={showAddCategory}
        title="Nueva Categoría"
        onClose={() => setShowAddCategory(false)}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddCategory(false)} className="whitespace-nowrap">Cancelar</Button>
            <Button variant="primary" onClick={handleAddCategory} className="whitespace-nowrap">Crear</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre</label>
            <input
              placeholder="Ej: Electrónica"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
            <input
              placeholder="Descripción opcional"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog
        isOpen={showAddProduct}
        title="Nuevo Producto"
        onClose={() => setShowAddProduct(false)}
        maxWidth="lg"
        scrollable={true}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAddProduct(false); setIsMultiFormat(false); setVariantRows([{ label: "", price: "", quantity: "" }]); setNewProduct({ name: "", sku: "", price: "", quantity: "", min_stock: "", category_id: "", description: "" }); setProductImage(null); setProductImagePreview(""); }} className="whitespace-nowrap">Cancelar</Button>
            <Button variant="primary" onClick={handleAddProduct} disabled={uploadingImage} className="whitespace-nowrap">{uploadingImage ? "Subiendo..." : "Agregar"}</Button>
          </div>
        }
      >
        <div className="space-y-5 mb-6">
              {/* Row 1: Nombre & Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre *</label>
                  <input
                    placeholder="Nombre del producto"
                    value={newProduct.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setNewProduct({ ...newProduct, name: newName, sku: generateSKU(newName) });
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Categoría</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sin categoría —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: SKU & Descripción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">SKU *</label>
                  <input
                    placeholder="Generado automáticamente"
                    value={newProduct.sku}
                    readOnly
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
                    title="El SKU se genera automáticamente a partir del nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
                  <input
                    placeholder="Descripción opcional"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Imagen del producto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Imagen del producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">JPG, PNG (máx 5MB)</p>
              </div>
            </div>

            {/* Image preview */}
            {productImagePreview && (
              <div className="mt-6 mb-6 flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <img
                  src={productImagePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-300"
                />
                <button
                  onClick={() => {
                    setProductImage(null);
                    setProductImagePreview("");
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  ❌ Eliminar imagen
                </button>
              </div>
            )}

            {/* Multi-format toggle */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMultiFormat}
                  onChange={(e) => {
                    setIsMultiFormat(e.target.checked);
                    setVariantRows([{ label: "", price: "", quantity: "" }]);
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">Multi-formato (varios tamaños / presentaciones)</span>
              </label>
            </div>

            {/* Single product price+qty OR variant rows */}
            {isMultiFormat ? (
              <div className="space-y-4 mb-6">
                <p className="text-sm font-bold text-slate-700">Formatos y Precios:</p>
                {variantRows.map((v, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? "Formato *" : ""}</label>
                      <input
                        placeholder="Ej: 15g"
                        value={v.label}
                        onChange={(e) => {
                          const copy = [...variantRows];
                          copy[i] = { ...copy[i], label: e.target.value };
                          setVariantRows(copy);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? "Precio *" : ""}</label>
                      <input
                        type="number"
                        placeholder="Precio"
                        value={v.price}
                        onChange={(e) => {
                          const copy = [...variantRows];
                          copy[i] = { ...copy[i], price: e.target.value };
                          setVariantRows(copy);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? "Stock" : ""}</label>
                      <input
                        type="number"
                        placeholder="Stock"
                        value={v.quantity}
                        onChange={(e) => {
                          const copy = [...variantRows];
                          copy[i] = { ...copy[i], quantity: e.target.value };
                          setVariantRows(copy);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {variantRows.length > 1 && (
                      <button
                        onClick={() => setVariantRows(variantRows.filter((_, idx) => idx !== i))}
                        className="px-2 py-1 text-red-500 hover:text-red-700 text-lg font-bold"
                        title="Eliminar formato"
                      >×</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setVariantRows([...variantRows, { label: "", price: "", quantity: "" }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >+ Agregar formato</button>
              </div>
            ) : (
              <div className="space-y-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Precio *</label>
                    <input
                      type="number"
                      placeholder="Precio unitario"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Stock inicial</label>
                    <input
                      type="number"
                      placeholder="Cantidad disponible"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Stock mínimo</label>
                  <input
                    type="number"
                    placeholder="Alerta bajo inventario"
                    value={newProduct.min_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, min_stock: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">Se alertará cuando el stock llegue a este número</p>
                </div>
              </div>
            )}

      </Dialog>

      {/* Reorder mode — grouped by category with ↑↓ buttons */}
      {reorderMode && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
            <p className="text-sm font-semibold text-slate-700">
              Modo ordenar — usa las flechas para reorganizar categorías y productos
            </p>
            {savingOrder && <span className="text-xs text-slate-600 animate-pulse">Guardando...</span>}
          </div>

          <div className="divide-y divide-slate-200">

          {/* Uncategorized products */}
          {products.filter((p) => !p.category_id).length > 0 && (
            <div className="border-b border-slate-100">
              <div className="px-4 py-2 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
                Sin categoría
              </div>
              {products
                .filter((p) => !p.category_id)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((product, idx, arr) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50">
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveProduct(product.id, undefined, -1)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >▲</button>
                      <button
                        disabled={idx === arr.length - 1}
                        onClick={() => moveProduct(product.id, undefined, 1)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >▼</button>
                    </div>
                    <span className="text-sm font-medium text-slate-800 flex-1">{product.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Categories with their products */}
          {categories.map((cat, catIdx) => {
            const catProducts = products
              .filter((p) => p.category_id === cat.id)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            return (
              <div key={cat.id} className="border-b border-slate-100 last:border-0">
                {/* Category header with move buttons */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <button
                      disabled={catIdx === 0}
                      onClick={() => moveCategory(cat.id, -1)}
                      className="p-0.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-20 text-xs font-bold"
                    >▲</button>
                    <button
                      disabled={catIdx === categories.length - 1}
                      onClick={() => moveCategory(cat.id, 1)}
                      className="p-0.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-20 text-xs font-bold"
                    >▼</button>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600 flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-400">{catProducts.length} prod.</span>
                </div>
                {/* Products in this category */}
                {catProducts.map((product, pIdx) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 pl-12 border-b border-slate-50 hover:bg-slate-50">
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={pIdx === 0}
                        onClick={() => moveProduct(product.id, cat.id, -1)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >▲</button>
                      <button
                        disabled={pIdx === catProducts.length - 1}
                        onClick={() => moveProduct(product.id, cat.id, 1)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >▼</button>
                    </div>
                    <span className="text-sm font-medium text-slate-800 flex-1">{product.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
                  </div>
                ))}
                {catProducts.length === 0 && (
                  <p className="px-12 py-2 text-xs text-slate-400 italic">Sin productos en esta categoría</p>
                )}
              </div>
            );
          })}
          </div>
        </Card>
      )}

      {/* Products table */}
      {!reorderMode && (
      <Card>

        <div className="flex flex-col sm:flex-row gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50">
          <SearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder="Buscar por nombre, SKU..."
            className="flex-1"
          />
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
          <p className="p-6 text-slate-500">Cargando...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-12 text-center text-slate-400">
            {products.length === 0
              ? "Ningún producto. Comience creando una categoría y agregando un producto."
              : "Sin resultados para esta búsqueda."}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table view */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left text-white">Producto</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell text-white">SKU</th>
                  <th className="px-4 py-2.5 text-left hidden lg:table-cell text-white">Categoría</th>
                  <th className="px-4 py-2.5 text-right text-white">Precio</th>
                  <th className="px-4 py-2.5 text-center text-white">Stock</th>
                  <th className="px-4 py-2.5 text-center hidden sm:table-cell text-white" title="Stock mínimo requerido">Mín.</th>
                  <th className="px-4 py-2.5 text-center w-28 text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => {
                  const category = categories.find((c) => c.id === product.category_id);
                  const isEditing = editingProductId === product.id;
                  const isExpanded = expandedProductId === product.id;
                  const hasVariants = product.has_variants && (product.variants?.length ?? 0) > 0;
                  return (
                    <React.Fragment key={product.id}>
                    <tr className="group hover:bg-blue-50 transition-colors border-b border-slate-200">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {hasVariants && (
                            <button
                              onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                              className="text-slate-400 hover:text-slate-700 transition-colors"
                              title={isExpanded ? "Ocultar formatos" : "Ver formatos"}
                            >
                              <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">
                              {product.name}
                              {hasVariants && (
                                <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  {product.variants!.length} formatos
                                </span>
                              )}
                            </p>
                            {product.description && (
                              <p className="text-sm text-slate-500 truncate max-w-xs">{product.description}</p>
                            )}
                          </div>
                        </div>
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
                        {hasVariants ? <span className="text-slate-400 text-sm">—</span> : fmt(product.price)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {hasVariants ? (
                          <span className="text-slate-400 text-sm">—</span>
                        ) : isEditing ? (
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
                              : ((product as any).min_stock ?? 0) > 0 && product.quantity <= ((product as any).min_stock ?? 0)
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {product.quantity}
                          </span>
                        )}
                      </td>
                      {/* Min stock cell */}
                      <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                        {hasVariants ? (
                          <span className="text-slate-400 text-sm">—</span>
                        ) : editingMinStockId === product.id ? (
                          <div className="flex gap-1 justify-center">
                            <input
                              type="number"
                              value={editingMinStock}
                              onChange={(e) => setEditingMinStock(e.target.value)}
                              className="w-16 px-2 py-1 border border-orange-400 rounded text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              min="0"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateMinStock(product.id, editingMinStock)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
                            >✓</button>
                            <button
                              onClick={() => { setEditingMinStockId(null); setEditingMinStock(""); }}
                              className="px-2 py-1 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg"
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingMinStockId(product.id); setEditingMinStock(((product as any).min_stock ?? 0).toString()); }}
                            className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all ${
                              ((product as any).min_stock ?? 0) === 0
                                ? "bg-slate-100 text-slate-400"
                                : "bg-orange-100 text-orange-700"
                            }`}
                            title="Clic para editar stock mínimo"
                          >
                            {((product as any).min_stock ?? 0) === 0 ? "—" : (product as any).min_stock}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!hasVariants && isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, editingQuantity)}
                              className="inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                            >✓</button>
                            <button
                              onClick={() => { setEditingProductId(null); setEditingQuantity(""); }}
                              className="inline-flex items-center px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                            >✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <IconButton
                              icon="edit"
                              color="slate"
                              size="sm"
                              onClick={() => openEditModal(product)}
                              title="Editar producto"
                            />
                            {!hasVariants && (
                              <IconButton
                                icon="stock"
                                color="blue"
                                size="sm"
                                onClick={() => { setEditingProductId(product.id); setEditingQuantity(product.quantity.toString()); }}
                                title="Editar stock"
                              />
                            )}
                            <IconButton
                              icon="delete"
                              color="red"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Eliminar"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* Variant sub-rows */}
                    {hasVariants && isExpanded && product.variants!
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((variant, sortedIdx, sortedArray) => {
                      const isEditingV = editingVariantId === variant.id;
                      return (
                        <tr key={variant.id} className="bg-purple-50 border-b border-purple-100">
                          <td className="px-4 py-2 pl-12">
                            <span className="text-sm font-medium text-purple-800">{variant.label}</span>
                            <span className="ml-2 font-mono text-xs text-slate-400 bg-slate-100 px-1 rounded">{variant.sku}</span>
                          </td>
                          <td className="px-4 py-2 hidden md:table-cell"></td>
                          <td className="px-4 py-2 hidden lg:table-cell"></td>
                          <td className="px-4 py-2 text-right font-semibold text-purple-700 text-sm whitespace-nowrap">
                            {fmt(variant.price)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {isEditingV ? (
                              <input
                                type="number"
                                value={editingVariantQty}
                                onChange={(e) => setEditingVariantQty(e.target.value)}
                                className="w-16 px-2 py-1 border border-purple-400 rounded text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="0"
                                autoFocus
                              />
                            ) : (
                              <span className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold ${
                                variant.stock_quantity <= 0
                                  ? "bg-red-100 text-red-700"
                                  : variant.stock_quantity <= 5
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {variant.stock_quantity}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center hidden sm:table-cell">
                            {editingVariantMinStockId === variant.id ? (
                              <div className="flex gap-1 justify-center">
                                <input
                                  type="number"
                                  value={editingVariantMinStock}
                                  onChange={(e) => setEditingVariantMinStock(e.target.value)}
                                  className="w-12 px-1 py-0.5 border border-purple-400 rounded text-center text-xs text-slate-900"
                                  min="0"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateVariantMinStock(product.id, variant.id, editingVariantMinStock)}
                                  className="px-1 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                                >✓</button>
                                <button
                                  onClick={() => { setEditingVariantMinStockId(null); setEditingVariantMinStock(""); }}
                                  className="px-1 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                                >✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingVariantMinStockId(variant.id); setEditingVariantMinStock(String(variant.min_stock ?? 0)); }}
                                className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold rounded"
                                title="Editar stock mínimo"
                              >
                                {variant.min_stock ?? 0}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {isEditingV ? (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleUpdateVariantQty(product.id, variant.id, editingVariantQty)}
                                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
                                >✓</button>
                                <button
                                  onClick={() => { setEditingVariantId(null); setEditingVariantQty(""); }}
                                  className="px-2.5 py-1 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg"
                                >✕</button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleReorderVariant(product.id, variant.id, "up")}
                                  disabled={sortedIdx === 0}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-lg"
                                  title="Subir orden"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => handleReorderVariant(product.id, variant.id, "down")}
                                  disabled={sortedIdx === sortedArray.length - 1}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold rounded-lg"
                                  title="Bajar orden"
                                >
                                  ↓
                                </button>
                                <IconButton
                                  icon="stock"
                                  color="blue"
                                  size="sm"
                                  onClick={() => { setEditingVariantId(variant.id); setEditingVariantQty(variant.stock_quantity.toString()); }}
                                  title="Editar stock"
                                />
                                <IconButton
                                  icon="delete"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleDeleteVariant(product.id, variant.id)}
                                  title="Eliminar formato"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-200 text-sm text-slate-400 bg-slate-50">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              {(search || filterCategory) && ` · filtrado de ${products.length}`}
            </div>
            </div>

            {/* Mobile: Card view */}
            <div className="sm:hidden space-y-3 px-2">
              {filteredProducts.map((product) => {
                const category = categories.find((c) => c.id === product.category_id);
                const hasVariants = product.has_variants && (product.variants?.length ?? 0) > 0;
                return (
                  <div key={product.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    {/* Row 1: Name + Price */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-slate-500 truncate">{product.description}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold whitespace-nowrap">
                        {hasVariants ? (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">Múltiples</span>
                        ) : (
                          <span className="text-blue-700">{fmt(product.price)}</span>
                        )}
                      </span>
                    </div>

                    {/* Row 2: Category + SKU */}
                    <div className="flex justify-between items-center text-xs gap-2">
                      {category ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span className="font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                        {product.sku}
                      </span>
                    </div>

                    {/* Row 3: Stock */}
                    {!hasVariants && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Stock:</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                          product.quantity <= 0
                            ? "bg-red-100 text-red-700"
                            : ((product as any).min_stock ?? 0) > 0 && product.quantity <= ((product as any).min_stock ?? 0)
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {product.quantity}
                        </span>
                      </div>
                    )}

                    {/* Row 4: Variants list */}
                    {hasVariants && (
                      <div className="space-y-1.5 p-2 bg-purple-50 border border-purple-100 rounded-lg">
                        <p className="text-xs font-semibold text-purple-700 mb-2">📦 Formatos ({product.variants!.length})</p>
                        {(product.variants ?? [])
                          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          .map((variant, variantIdx, sortedVariants) => (
                          <div key={variant.id} className="bg-white rounded p-2 text-xs border border-purple-100">
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-semibold text-slate-900">{variant.label}</span>
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  variant.stock_quantity <= 0
                                    ? "bg-red-100 text-red-700"
                                    : variant.stock_quantity <= 5
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-green-100 text-green-700"
                                }`}>
                                  {variant.stock_quantity}
                                </span>
                                {/* Reorder buttons for mobile */}
                                <button
                                  onClick={() => handleReorderVariant(product.id, variant.id, "up")}
                                  disabled={variantIdx === 0}
                                  className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded"
                                  title="Subir"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => handleReorderVariant(product.id, variant.id, "down")}
                                  disabled={variantIdx === sortedVariants.length - 1}
                                  className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded"
                                  title="Bajar"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between text-slate-600 text-xs mb-1">
                              <span className="font-mono">{variant.sku}</span>
                              <span className="font-semibold text-purple-700">{fmt(variant.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Row 5: Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium text-slate-700 transition-colors"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      {!hasVariants && (
                        <button
                          onClick={() => { setEditingProductId(product.id); setEditingQuantity(product.quantity.toString()); }}
                          className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium text-blue-600 transition-colors"
                        >
                          <Package size={14} />
                          Stock
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-medium text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
      )}
      </Section>
    </Container>
  );
}
