"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";
import { Button, Card, Container, Section, Alert } from "@/components/StripeUIComponents";
import { IconButton, PageIcon, SearchInput, DashboardHeader, Dialog, DialogFooter, EmptyState } from "@/components";
import { Pencil, Package, Trash2, History, TrendingUp, TrendingDown, SlidersHorizontal, RotateCcw, Printer } from "lucide-react";
import { buildPrintDocument, openPrintWindow, escHtml } from "@/lib/export";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useLanguage } from "@/context/LanguageContext";

interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock?: number;
  sort_order?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
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

/**
 * Calculate profit margin percentage
 */
function calculateMarginPercent(price: number, cost: number): number {
  if (!price || !cost || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

/**
 * Calculate profit per unit
 */
function calculateProfitPerUnit(price: number, cost: number): number {
  return price - cost;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const router = useRouter();
  const { fmt } = useCurrency();
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null);
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
  // State for full variant editing
  const [editingVariantData, setEditingVariantData] = useState<{
    productId: string;
    variantId: string;
    label: string;
    sku: string;
    price: string;
    cost_price: string;
  } | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  // Edit product modal
  const [editProductModal, setEditProductModal] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    price: "",
    cost_price: "",
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
    cost_price: "",
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
  const [variantRows, setVariantRows] = useState<{ label: string; price: string; cost_price: string; quantity: string }[]>([
    { label: "", price: "", cost_price: "", quantity: "" },
  ]);

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });

  // ── Stock Movements ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"productos" | "movimientos">("productos");

  interface StockMovement {
    id: string;
    product_id: string;
    variant_id: string | null;
    product_name: string;
    variant_label: string | null;
    movement_type: "sale" | "restock" | "adjustment" | "return" | "damage" | "initial";
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    reference_id: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
  }

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movFilterProduct, setMovFilterProduct] = useState("");
  const [movFilterType, setMovFilterType] = useState("");
  const [movFilterFrom, setMovFilterFrom] = useState("");
  const [movFilterTo, setMovFilterTo] = useState("");

  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    product_id: "",
    variant_id: "",
    movement_type: "restock" as "restock" | "adjustment" | "damage" | "return",
    quantity: "",
    notes: "",
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
        return loadedProducts as Product[];
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
      setMessage(t("inventory.errors.loadingInventory"));
    } finally {
      setLoading(false);
    }
    return [] as Product[];
  }, [tenantId]);

  const fetchMovements = useCallback(async (params?: {
    product_id?: string;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    if (!tenantId) return;
    setMovementsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params?.product_id)    qs.set("product_id",    params.product_id);
      if (params?.movement_type) qs.set("movement_type", params.movement_type);
      if (params?.from_date)     qs.set("from_date",     params.from_date);
      if (params?.to_date)       qs.set("to_date",       params.to_date);
      qs.set("limit", "200");

      const res = await fetch(`/api/tenants/${tenantId}/stock-movements?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMovements(json.movements || []);
        setMovementsTotal(json.total || 0);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setMovementsLoading(false);
    }
  }, [tenantId]);

  const handleAdjustStock = async () => {
    if (!adjustForm.product_id || !adjustForm.quantity || isNaN(parseInt(adjustForm.quantity))) {
      setMessage(t("inventory.errors.selectProductAndQty"));
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}/stock-movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id:    adjustForm.product_id,
          variant_id:    adjustForm.variant_id || undefined,
          movement_type: adjustForm.movement_type,
          quantity:      parseInt(adjustForm.quantity),
          notes:         adjustForm.notes,
          created_by:    user?.email || user?.id,
        }),
      });
      if (res.ok) {
        setMessage(t("inventory.success.movementRecorded"));
        setShowAdjustModal(false);
        setAdjustForm({ product_id: "", variant_id: "", movement_type: "restock", quantity: "", notes: "" });
        await fetchData();
        await fetchMovements({ product_id: movFilterProduct || undefined, movement_type: movFilterType || undefined, from_date: movFilterFrom || undefined, to_date: movFilterTo || undefined });
      } else {
        const err = await res.json();
        setMessage(err.error || t("inventory.errors.adjustError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      setMessage(t("inventory.errors.categoryNameRequired"));
      return;
    }

    if (!tenantId) {
      setMessage(t("inventory.errors.tenantNotFound"));
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
        setMessage(t("inventory.success.categoryCreated"));
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
      setMessage(t("inventory.errors.networkError"));
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
      setMessage(t("inventory.errors.imageUpload"));
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage(t("inventory.errors.imageTypeError"));
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage(t("inventory.errors.imageSizeError"));
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
      setMessage(t("inventory.errors.nameSkuRequired"));
      return;
    }
    if (!isMultiFormat && !newProduct.price) {
      setMessage(t("inventory.errors.priceRequired"));
      return;
    }
    if (isMultiFormat && variantRows.some((v) => !v.label.trim() || !v.price)) {
      setMessage(t("inventory.errors.variantNamePriceRequired"));
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
        cost_price: isMultiFormat ? 0 : (newProduct.cost_price ? parseFloat(newProduct.cost_price as string) : 0),
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
                cost_price: v.cost_price ? parseFloat(v.cost_price) : 0,
                stock_quantity: v.quantity ? parseInt(v.quantity) : 0,
                sort_order: i,
              }),
            })
          )
        );
      }

      setMessage(t("inventory.success.productCreated"));
      setNewProduct({ name: "", sku: "", price: "", cost_price: "", quantity: "", min_stock: "", category_id: "", description: "" });
      setProductImage(null);
      setProductImagePreview("");
      setIsMultiFormat(false);
      setVariantRows([{ label: "", price: "", cost_price: "", quantity: "" }]);
      setShowAddProduct(false);
      await fetchData();
    } catch (error) {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t("inventory.confirm.deleteProduct"))) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage(t("inventory.success.productDeleted"));
        await fetchData();
      } else {
        setMessage(t("inventory.errors.deleteError"));
      }
    } catch (error) {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: string) => {
    if (!newQuantity || isNaN(parseInt(newQuantity))) {
      setMessage(t("inventory.errors.invalidQuantity"));
      return;
    }

    const newQty = parseInt(newQuantity);
    const product = products.find((p) => p.id === productId);
    const oldQty  = product?.quantity ?? 0;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });

      if (res.ok) {
        setMessage(t("inventory.success.stockUpdated"));
        setEditingProductId(null);
        setEditingQuantity("");

        // Record movement if quantity actually changed
        if (newQty !== oldQty) {
          const delta = newQty - oldQty;
          const movement_type = delta > 0 ? "restock" : "adjustment";
          try {
            await fetch(`/api/tenants/${tenantId}/stock-movements`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_id:    productId,
                movement_type,
                quantity:      Math.abs(delta),
                notes:         t("inventory.notes.manualUpdate", { before: String(oldQty), after: String(newQty) }),
                created_by:    user?.email || user?.id,
              }),
            });
          } catch { /* fire-and-forget */ }
        }

        await fetchData();
      } else {
        const error = await res.json();
        setMessage(error.error || t("inventory.errors.updateError"));
      }
    } catch (error) {
      setMessage(t("inventory.errors.networkError"));
      console.error(error);
    }
  };

  const handleUpdateMinStock = async (productId: string, value: string) => {
    if (value === "" || isNaN(parseInt(value))) {
      setMessage(t("inventory.errors.invalidMinStock"));
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
        setMessage(err.error || t("inventory.errors.updateMinStockError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleUpdateVariantQty = async (productId: string, variantId: string, qty: string) => {
    if (!qty || isNaN(parseInt(qty))) {
      setMessage(t("inventory.errors.invalidQuantity"));
      return;
    }
    const newQty = parseInt(qty);
    const variant = products
      .find((p) => p.id === productId)
      ?.variants?.find((v) => v.id === variantId);
    const oldQty = variant?.stock_quantity ?? 0;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: newQty }),
      });
      if (res.ok) {
        setMessage(t("inventory.success.stockUpdated"));
        setEditingVariantId(null);
        setEditingVariantQty("");

        // Record movement if quantity actually changed
        if (newQty !== oldQty) {
          const delta = newQty - oldQty;
          const movement_type = delta > 0 ? "restock" : "adjustment";
          try {
            await fetch(`/api/tenants/${tenantId}/stock-movements`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_id:    productId,
                variant_id:    variantId,
                movement_type,
                quantity:      Math.abs(delta),
                notes:         t("inventory.notes.manualUpdate", { before: String(oldQty), after: String(newQty) }),
                created_by:    user?.email || user?.id,
              }),
            });
          } catch { /* fire-and-forget */ }
        }

        await fetchData();
      } else {
        setMessage(t("inventory.errors.updateError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    if (!confirm(t("inventory.confirm.deleteVariant"))) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage(t("inventory.success.variantDeleted"));
        await fetchData();
      } else {
        setMessage(t("inventory.errors.deleteError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleUpdateVariantMinStock = async (productId: string, variantId: string, minStock: string) => {
    if (!minStock || isNaN(parseInt(minStock))) {
      setMessage(t("inventory.errors.invalidMinStock"));
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_stock: parseInt(minStock) }),
      });
      if (res.ok) {
        setMessage(t("inventory.success.minStockUpdated"));
        setEditingVariantMinStockId(null);
        setEditingVariantMinStock("");
        await fetchData();
      } else {
        setMessage(t("inventory.errors.updateError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const handleUpdateVariantProperties = async () => {
    if (!editingVariantData) return;
    
    const { productId, variantId, label, sku, price, cost_price } = editingVariantData;
    
    if (!label || !price || isNaN(parseFloat(price))) {
      setMessage(t("inventory.errors.fillAllRequired"));
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantId}/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          sku,
          price: parseFloat(price),
          cost_price: cost_price ? parseFloat(cost_price) : 0,
        }),
      });
      if (res.ok) {
        const updatedVariant = await res.json();
        setMessage(t("inventory.success.variantUpdated"));
        setEditingVariantData(null);

        // Update local state without triggering a full page reload
        const patchVariant = (v: ProductVariant) =>
          v.id === variantId
            ? {
                ...v,
                label: updatedVariant.label ?? label,
                price: updatedVariant.price ?? parseFloat(price),
                cost_price: updatedVariant.cost_price ?? (cost_price ? parseFloat(cost_price) : 0),
              }
            : v;

        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, variants: p.variants?.map(patchVariant) }
              : p
          )
        );
        setEditProductModal((prev: any) =>
          prev?.id === productId
            ? { ...prev, variants: prev.variants?.map(patchVariant) }
            : prev
        );
      } else {
        setMessage(t("inventory.errors.updateError"));
      }
    } catch (error) {
      setMessage(t("inventory.errors.networkError"));
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
      
      setMessage(t("inventory.success.variantReordered"));
    } catch (error) {
      console.error("❌ Network error:", error);
      setMessage(t("inventory.errors.networkError"));
    }
  };

  const openEditModal = (product: Product) => {
    setEditProductModal(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      cost_price: String(product.cost_price),
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
      setMessage(t("inventory.errors.nameRequired"));
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
        cost_price: parseFloat(editForm.cost_price) || 0,
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
        setMessage(t("inventory.success.productUpdated"));
        setEditProductModal(null);
        await fetchData();
      } else {
        const err = await res.json();
        setMessage(err.error || t("inventory.errors.saveError"));
      }
    } catch {
      setMessage(t("inventory.errors.networkError"));
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

  // ── Print inventory ────────────────────────────────────────────────────────
  const handlePrintInventory = () => {
    // Build a snapshot of displayed products grouped by category
    const allDisplayed = filteredProducts;

    // Group by category
    type CatGroup = { name: string; products: Product[] };
    const grouped: CatGroup[] = [];
    const catMap = new Map<string, CatGroup>();

    for (const p of allDisplayed) {
      const cat = categories.find((c) => c.id === p.category_id);
      const catName = cat?.name ?? t("inventory.uncategorized");
      const key = p.category_id ?? "__none__";
      if (!catMap.has(key)) {
        const g: CatGroup = { name: catName, products: [] };
        catMap.set(key, g);
        grouped.push(g);
      }
      catMap.get(key)!.products.push(p);
    }

    // Stats
    const totalProducts   = allDisplayed.length;
    const totalVariants   = allDisplayed.reduce((s, p) => s + (p.variants?.length ?? 0), 0);
    const lowStock        = allDisplayed.filter((p) => {
      if (p.has_variants && p.variants?.length) {
        return p.variants.some((v) => v.stock_quantity <= (v.min_stock ?? 0));
      }
      return p.quantity <= (p.min_stock ?? 0);
    });
    const totalStockValue = allDisplayed.reduce((s, p) => {
      if (p.has_variants && p.variants?.length) {
        return s + p.variants.reduce((sv, v) => sv + v.stock_quantity * v.price, 0);
      }
      return s + p.quantity * p.price;
    }, 0);

    const printedAt = new Intl.DateTimeFormat("es-NI", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date());

    // ── Stats header ─────────────────────────────────────────────────────────
    const statsHtml = `
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">${t("inventory.products")}</div>
    <div class="stat-value">${totalProducts}</div>
    ${totalVariants > 0 ? `<div class="stat-sub">${totalVariants} formats</div>` : ""}
  </div>
  <div class="stat-card">
    <div class="stat-label">Valeur totale stock</div>
    <div class="stat-value">${fmt(totalStockValue)}</div>
  </div>
  ${lowStock.length > 0 ? `
  <div class="stat-card">
    <div class="stat-label">⚠ Stock bas</div>
    <div class="stat-value" style="color:#b45309">${lowStock.length}</div>
    <div class="stat-sub">produit(s) sous le minimum</div>
  </div>` : ""}
</div>`;

    // ── Table rows ────────────────────────────────────────────────────────────
    const colCount = 5; // Produit | SKU | Prix | Stock | Min
    const rows: string[] = [];

    for (const g of grouped) {
      rows.push(`<tr class="cat-header"><td colspan="${colCount}">${escHtml(g.name.toUpperCase())}</td></tr>`);
      for (const p of g.products) {
        const hasVariants = p.has_variants && (p.variants?.length ?? 0) > 0;
        const stockClass  = p.quantity <= (p.min_stock ?? 0) && !hasVariants ? ' style="color:#b45309;font-weight:700"' : "";
        const varBadge    = hasVariants
          ? ` <span class="badge badge-slate">${p.variants!.length} formats</span>`
          : "";

        rows.push(`<tr class="product-row">
          <td><span class="product-name">${escHtml(p.name)}</span>${varBadge}</td>
          <td class="muted">${escHtml(p.sku || "—")}</td>
          <td class="right">${fmt(p.price)}</td>
          <td class="right"${hasVariants ? ' class="muted"' : ""}${stockClass}>${hasVariants ? "—" : p.quantity}</td>
          <td class="right muted">${p.min_stock ?? 0}</td>
        </tr>`);

        if (hasVariants) {
          for (const v of p.variants!) {
            const vLow    = v.stock_quantity <= (v.min_stock ?? 0);
            const vStyle  = vLow ? ' style="color:#b45309;font-weight:700"' : "";
            rows.push(`<tr class="variant-row">
              <td class="variant-label">↳ ${escHtml(v.label)}</td>
              <td class="muted">${escHtml(v.sku || "—")}</td>
              <td class="right muted">${fmt(v.price)}</td>
              <td class="right"${vStyle}>${v.stock_quantity}</td>
              <td class="right muted">${v.min_stock ?? 0}</td>
            </tr>`);
          }
        }
      }

      // Category subtotal row
      const catStock = g.products.reduce((s, p) => {
        if (p.has_variants && p.variants?.length) return s + p.variants.reduce((sv, v) => sv + v.stock_quantity, 0);
        return s + p.quantity;
      }, 0);
      rows.push(`<tr class="cat-subtotal">
        <td colspan="${colCount - 1}">${g.products.length} produit(s)</td>
        <td class="right">${catStock} unités</td>
      </tr>`);
    }

    const bodyHtml = `
<div class="report-header">
  <h1>${escHtml(t("inventory.title"))}</h1>
  <div class="meta">${printedAt}</div>
</div>
${statsHtml}
<table>
  <thead>
    <tr>
      <th>${t("inventory.colProduct")}</th>
      <th>${t("inventory.sku")}</th>
      <th class="right">${t("inventory.price")}</th>
      <th class="right">${t("inventory.stock")}</th>
      <th class="right">${t("inventory.colMin")}</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join("\n    ")}
  </tbody>
</table>
<div class="report-footer">${printedAt}</div>
`;

    const extraStyles = `
      tr.cat-header td {
        background: #0f172a; color: #fff;
        padding: 6px 10px; font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.08em;
      }
      tr.product-row td { padding: 5px 10px; font-size: 10.5px; }
      .product-name { font-weight: 600; color: #1e293b; }
      tr.variant-row td {
        padding: 3px 10px 3px 24px; font-size: 10px;
        background: #f8fafc; color: #475569;
        border-bottom: 1px solid #e2e8f0;
      }
      .variant-label { color: #6366f1; font-style: italic; }
      tr.cat-subtotal td {
        background: #f1f5f9; color: #475569;
        padding: 3px 10px; font-size: 9.5px;
        border-top: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8;
      }
      tr.cat-subtotal td.right { text-align: right; font-weight: 700; color: #1e293b; }
    `;

    openPrintWindow(
      buildPrintDocument(bodyHtml, {
        title: t("inventory.title"),
        layout: "a4",
        extraStyles,
      })
    );
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
        title={t("inventory.editProduct")}
        onClose={() => { setEditProductModal(null); setEditingModalVariantQtyId(null); setEditingModalVariantQty(""); setEditingModalVariantMinStockId(null); setEditingModalVariantMinStock(""); }}
        maxWidth="md"
        footer={
          <div className="flex justify-end">
            <Button
              onClick={handleEditProduct}
              disabled={editSaving || uploadingEditImage}
              className="bg-blue-600 hover:bg-blue-700 text-white truncate"
            >
              {editSaving || uploadingEditImage ? t("inventory.saving") : t("inventory.saveChanges")}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.nameRequired")}</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nombre del producto"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.sku")}</label>
                  <input
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    placeholder="Código único"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.price")}</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="Precio unitario"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.purchaseCost")}</label>
                  <input
                    type="number"
                    value={editForm.cost_price}
                    onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                    placeholder="Costo de adquisición"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* Profit margin display in edit mode */}
              {editForm.price && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-600">{t("inventory.profitPerUnit")}</p>
                      <p className="font-bold text-green-700">{fmt(calculateProfitPerUnit(parseFloat(editForm.price) || 0, parseFloat(editForm.cost_price) || 0))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">{t("inventory.profitMargin")}</p>
                      <p className="font-bold text-green-700">{calculateMarginPercent(parseFloat(editForm.price) || 0, parseFloat(editForm.cost_price) || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.category")}</label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("inventory.noCategoryOption")}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                {editProductModal && !(editProductModal as any).has_variants && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.currentStock")}</label>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      placeholder="Cantidad en stock"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              {editProductModal && !(editProductModal as any).has_variants && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.minStock")}</label>
                  <input
                    type="number"
                    value={editForm.min_stock}
                    onChange={(e) => setEditForm({ ...editForm, min_stock: e.target.value })}
                    placeholder="Alerta bajo inventario"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">{t("inventory.minStockHint")}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.description")}</label>
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
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("inventory.manageVariants")}</h3>
                  
                  {/* Editing a variant's properties */}
                  {editingVariantData && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-slate-900 mb-3">{t("inventory.editVariant")}</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">{t("inventory.label")}</label>
                          <input
                            type="text"
                            value={editingVariantData.label}
                            onChange={(e) => setEditingVariantData({ ...editingVariantData, label: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                            placeholder="Ej: Pequeño"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">{t("inventory.salePrice")}</label>
                          <input
                            type="number"
                            value={editingVariantData.price}
                            onChange={(e) => setEditingVariantData({ ...editingVariantData, price: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">{t("inventory.cost")}</label>
                          <input
                            type="number"
                            value={editingVariantData.cost_price}
                            onChange={(e) => setEditingVariantData({ ...editingVariantData, cost_price: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateVariantProperties}
                          className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                        >
                          {t("inventory.save")}
                        </button>
                        <button
                          onClick={() => setEditingVariantData(null)}
                          className="flex-1 px-3 py-1 bg-slate-300 text-slate-700 text-xs font-semibold rounded"
                        >
                          {t("inventory.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {((editProductModal as any).variants as ProductVariant[])
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((variant: ProductVariant, idx: number, sortedArray: ProductVariant[]) => (
                      <div key={variant.id} className="bg-white border border-purple-100 rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{variant.label}</p>
                          <p className="text-xs text-slate-500">Venta: ${variant.price} · Costo: ${variant.cost_price || 0}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {t("inventory.stockLabel")}: <span className={`font-semibold ${variant.stock_quantity <= 0 ? 'text-red-600' : 'text-green-600'}`}>{variant.stock_quantity}</span>
                            {variant.price && <span className="ml-2 text-green-600 font-semibold">{t("inventory.margin")}: {calculateMarginPercent(variant.price, variant.cost_price || 0).toFixed(0)}%</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-start sm:justify-end">
                          {/* Edit properties button */}
                          <button
                            onClick={() => setEditingVariantData({
                              productId: (editProductModal as any).id,
                              variantId: variant.id,
                              label: variant.label,
                              sku: variant.sku || "",
                              price: variant.price.toString(),
                              cost_price: (variant.cost_price || 0).toString(),
                            })}
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-600 text-xs font-semibold rounded"
                            title="Editar propiedades"
                          >
                            {t("inventory.properties")}
                          </button>
                          
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
                              {t("inventory.stock")}
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
                              {t("inventory.minShort", { val: String(variant.min_stock ?? 0) })}
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.productImage")}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith("image/")) {
                        setMessage(t("inventory.errors.imageTypeError"));
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setMessage(t("inventory.errors.imageSizeError"));
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
                <p className="text-xs text-slate-400 mt-0.5">{t("inventory.imageHint")}</p>
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
                  {t("inventory.deleteImage")}
                </button>
              </div>
            )}
      </Dialog>

      {/* Header */}
      <DashboardHeader 
        pageType="inventory" 
        title={t("inventory.title")}
        subtitle={products.length === 1 ? t("inventory.pageSubtitle", { count: "1" }) : t("inventory.pageSubtitlePlural", { count: String(products.length) })}
      >
        <Button
          variant={reorderMode ? "danger" : "secondary"}
          onClick={() => setReorderMode((v) => !v)}
        >
          {reorderMode ? t("inventory.exitOrder") : t("inventory.reorderMode")}
        </Button>
        <Button variant="secondary" onClick={() => setShowCategoryManager((v) => !v)}>
          {showCategoryManager ? t("inventory.hideCategories") : t("inventory.showCategories")}
        </Button>
        {activeTab === "productos" && (
          <>
            <Button variant="secondary" onClick={handlePrintInventory} title="Imprimer l'inventaire">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="primary" onClick={() => setShowAddCategory(true)}>
              {t("inventory.addCategory")}
            </Button>
            <Button variant="primary" onClick={() => setShowAddProduct(true)}>
              {t("inventory.addProduct")}
            </Button>
          </>
        )}
        {activeTab === "movimientos" && user?.permissions?.includes("inventory.adjust") && (
          <Button variant="primary" onClick={() => setShowAdjustModal(true)}>
            <SlidersHorizontal className="w-4 h-4" />
            {t("inventory.adjustStock")}
          </Button>
        )}
      </DashboardHeader>

      {message && (
        <Alert variant="success" title={t("inventory.message")}>
          {message}
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200 -mt-2">
        <button
          onClick={() => setActiveTab("productos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "productos"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          {t("inventory.tab.products")}
        </button>
        <button
          onClick={() => {
            setActiveTab("movimientos");
            fetchMovements({
              product_id:    movFilterProduct || undefined,
              movement_type: movFilterType || undefined,
              from_date:     movFilterFrom || undefined,
              to_date:       movFilterTo || undefined,
            });
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "movimientos"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          {t("inventory.tab.movements")}
        </button>
      </div>

      {/* ── PRODUCTS TAB ─────────────────────────────────────────── */}
      {activeTab === "productos" && (<>

      {/* Category Manager Panel */}
      {showCategoryManager && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
            <p className="text-base font-bold text-slate-800">{t("inventory.categoryManager", { count: String(categories.length) })}</p>
            <Button variant="secondary" onClick={() => { setShowCategoryManager(false); setShowAddCategory(true); }}>
              {t("inventory.newCategory")}
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400">{t("inventory.noCategories")}</p>
            ) : (
              categories.map((cat) => {
                const productCount = products.filter((p) => p.category_id === cat.id).length;
                const isEditing = editingCategory?.id === cat.id;
                return (
                  <div key={cat.id} className="px-6 py-3 hover:bg-slate-50">
                    {isEditing ? (
                      /* Edit mode — inline fields */
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <input
                            autoFocus
                            value={editingCategory!.name}
                            onChange={(e) => setEditingCategory((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                            className="px-2.5 py-1.5 border border-blue-400 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre"
                          />
                          <input
                            value={editingCategory!.description}
                            onChange={(e) => setEditingCategory((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Descripción (opcional)"
                          />
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={async () => {
                              if (!editingCategory!.name.trim()) return;
                              const res = await fetch(`/api/tenants/${tenantId}/categories?id=${cat.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: editingCategory!.name, description: editingCategory!.description }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, name: updated.name, description: updated.description } : c));
                                setMessage(t("inventory.success.categoryRenamed", { name: updated.name }));
                              } else {
                                const err = await res.json();
                                setMessage(err.error || t("inventory.errors.saveError"));
                              }
                              setEditingCategory(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                          >
                            {t("inventory.save")}
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            {t("inventory.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal display mode */
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{cat.name}</p>
                          {cat.description && <p className="text-xs text-slate-500">{cat.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {t(productCount !== 1 ? "inventory.productsCountPlural" : "inventory.productsCount", { count: String(productCount) })}
                          </span>
                          {/* Edit button */}
                          <button
                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name, description: cat.description ?? "" })}
                            className="p-1.5 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar categoría"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={async () => {
                              const msg = productCount > 0
                                ? t("inventory.confirm.deleteCategoryWithProducts", { name: cat.name, count: String(productCount) })
                                : t("inventory.confirm.deleteCategory", { name: cat.name });
                              if (!confirm(msg)) return;
                              const res = await fetch(`/api/tenants/${tenantId}/categories?id=${cat.id}`, { method: "DELETE" });
                              if (res.ok) {
                                setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                                if (productCount > 0) {
                                  setProducts((prev) => prev.map((p) => p.category_id === cat.id ? { ...p, category_id: undefined } : p));
                                }
                                setMessage(productCount > 0
                                  ? t("inventory.success.categoryDeletedWithProducts", { name: cat.name, count: String(productCount) })
                                  : t("inventory.success.categoryDeleted", { name: cat.name }));
                              } else {
                                const err = await res.json();
                                setMessage(err.error || "Error al eliminar");
                              }
                            }}
                            className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar categoría"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Add Category Dialog */}
      <Dialog
        isOpen={showAddCategory}
        title={t("inventory.newCategoryTitle")}
        onClose={() => setShowAddCategory(false)}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddCategory(false)} className="whitespace-nowrap">{t("inventory.cancel")}</Button>
            <Button variant="primary" onClick={handleAddCategory} className="whitespace-nowrap">{t("inventory.create")}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.name")}</label>
            <input
              placeholder={t("inventory.categoryNamePlaceholder")}
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t("inventory.description")}</label>
            <input
              placeholder={t("inventory.descriptionPlaceholder")}
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
        title={t("inventory.newProduct")}
        onClose={() => setShowAddProduct(false)}
        maxWidth="lg"
        scrollable={true}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAddProduct(false); setIsMultiFormat(false); setVariantRows([{ label: "", price: "", cost_price: "", quantity: "" }]); setNewProduct({ name: "", sku: "", price: "", cost_price: "", quantity: "", min_stock: "", category_id: "", description: "" }); setProductImage(null); setProductImagePreview(""); }} className="whitespace-nowrap">{t("inventory.cancel")}</Button>
            <Button variant="primary" onClick={handleAddProduct} disabled={uploadingImage} className="whitespace-nowrap">{uploadingImage ? t("inventory.uploading") : t("inventory.add")}</Button>
          </div>
        }
      >
        <div className="space-y-5 mb-6">
              {/* Row 1: Nombre & Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.nameRequired")}</label>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.category")}</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("inventory.noCategoryOption")}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: SKU & Descripción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.skuRequired")}</label>
                  <input
                    placeholder={t("inventory.skuAutoGenerated")}
                    value={newProduct.sku}
                    readOnly
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
                    title="El SKU se genera automáticamente a partir del nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.description")}</label>
                  <input
                    placeholder={t("inventory.descriptionPlaceholder")}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Imagen del producto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.productImage")}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">{t("inventory.imageHint")}</p>
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
                  ❌ {t("inventory.deleteImage")}
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
                    setVariantRows([{ label: "", price: "", cost_price: "", quantity: "" }]);
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">{t("inventory.multiFormat")}</span>
              </label>
            </div>

            {/* Single product price+qty OR variant rows */}
            {isMultiFormat ? (
              <div className="space-y-4 mb-6">
                <p className="text-sm font-bold text-slate-700">{t("inventory.variantsAndPrices")}</p>
                {variantRows.map((v, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? t("inventory.variantFormat") : ""}</label>
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
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? t("inventory.priceRequired") : ""}</label>
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
                    <div className="w-28">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? t("inventory.cost") : ""}</label>
                      <input
                        type="number"
                        placeholder="Costo"
                        value={v.cost_price}
                        onChange={(e) => {
                          const copy = [...variantRows];
                          copy[i] = { ...copy[i], cost_price: e.target.value };
                          setVariantRows(copy);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{i === 0 ? t("inventory.stock") : ""}</label>
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
                    {/* Margin display for each variant */}
                    {v.price && (
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap font-semibold">
                        {calculateMarginPercent(parseFloat(v.price) || 0, parseFloat(v.cost_price) || 0).toFixed(0)}%
                      </div>
                    )}
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
                  onClick={() => setVariantRows([...variantRows, { label: "", price: "", cost_price: "", quantity: "" }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >+ {t("inventory.addVariant")}</button>
              </div>
            ) : (
              <div className="space-y-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.priceRequired")}</label>
                    <input
                      type="number"
                      placeholder="Precio unitario"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.purchaseCost")}</label>
                    <input
                      type="number"
                      placeholder="Costo de adquisición"
                      value={newProduct.cost_price}
                      onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {/* Profit margin display for single product */}
                {!isMultiFormat && newProduct.price && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-600">{t("inventory.profitPerUnit")}</p>
                        <p className="text-lg font-bold text-green-700">{fmt(calculateProfitPerUnit(parseFloat(newProduct.price) || 0, parseFloat(newProduct.cost_price) || 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{t("inventory.profitMargin")}</p>
                        <p className="text-lg font-bold text-green-700">{calculateMarginPercent(parseFloat(newProduct.price) || 0, parseFloat(newProduct.cost_price) || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.initialStock")}</label>
                    <input
                      type="number"
                      placeholder="Cantidad disponible"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t("inventory.minStock")}</label>
                    <input
                      type="number"
                      placeholder="Alerta bajo inventario"
                      value={newProduct.min_stock}
                      onChange={(e) => setNewProduct({ ...newProduct, min_stock: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-2">{t("inventory.minStockHint")}</p>
                  </div>
                </div>
              </div>
            )}

      </Dialog>

      {/* Reorder mode — grouped by category with ↑↓ buttons */}
      {reorderMode && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
            <p className="text-sm font-semibold text-slate-700">
              {t("inventory.reorderHint")}
            </p>
            {savingOrder && <span className="text-xs text-slate-600 animate-pulse">{t("inventory.saving")}</span>}
          </div>

          <div className="divide-y divide-slate-200">

          {/* Uncategorized products */}
          {products.filter((p) => !p.category_id).length > 0 && (
            <div className="border-b border-slate-100">
              <div className="px-4 py-2 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("inventory.uncategorized")}
              </div>
              {products
                .filter((p) => !p.category_id)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((product, idx, arr) => (
                  <div key={product.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 min-w-0">
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
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
                    <span className="text-xs sm:text-sm font-medium text-slate-800 flex-1 truncate">{product.name}</span>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0 hidden sm:inline">{product.sku}</span>
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
                  <div key={product.id} className="flex items-center gap-2 px-4 py-2.5 pl-12 border-b border-slate-50 hover:bg-slate-50 min-w-0">
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
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
                    <span className="text-xs sm:text-sm font-medium text-slate-800 flex-1 truncate">{product.name}</span>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0 hidden sm:inline">{product.sku}</span>
                  </div>
                ))}
                {catProducts.length === 0 && (
                  <p className="px-12 py-2 text-xs text-slate-400 italic">{t("inventory.noProductsInCategory")}</p>
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
            placeholder={t("inventory.searchPlaceholder")}
            className="flex-1"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("inventory.allCategories")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="__none__">{t("inventory.uncategorized")}</option>
          </select>
        </div>

        {loading ? (
          <EmptyState state="loading" message={t("inventory.loading")} />
        ) : filteredProducts.length === 0 ? (
          <p className="p-12 text-center text-slate-400">
            {products.length === 0
              ? t("inventory.noProducts")
              : t("inventory.noSearchResults")}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table view */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left text-white">{t("inventory.colProduct")}</th>
                  <th className="px-4 py-2.5 text-left hidden lg:table-cell text-white">{t("inventory.category")}</th>
                  <th className="px-4 py-2.5 text-right text-white">{t("inventory.price")}</th>
                  <th className="px-4 py-2.5 text-center text-white">{t("inventory.stock")}</th>
                  <th className="px-4 py-2.5 text-center hidden sm:table-cell text-white">{t("inventory.colMin")}</th>
                  <th className="px-4 py-2.5 text-center w-28 text-white">{t("inventory.colActions")}</th>
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
                              title={isExpanded ? t("inventory.hideVariants") : t("inventory.showVariants")}
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
                                  {t("inventory.variantCount", { count: String(product.variants!.length) })}
                                </span>
                              )}
                            </p>
                            {product.description && (
                              <p className="text-sm text-slate-500 truncate max-w-xs">{product.description}</p>
                            )}
                          </div>
                        </div>
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
                          </td>
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
              {filteredProducts.length === 1 ? t("inventory.productsCount", { count: "1" }) : t("inventory.productsCountPlural", { count: String(filteredProducts.length) })}
              {(search || filterCategory) && ` · ${t("inventory.filteredFrom", { count: String(products.length) })}`}
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
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">{t("inventory.multiple")}</span>
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
                        <span className="text-slate-600">{t("inventory.stockLabel")}</span>
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
                        <p className="text-xs font-semibold text-purple-700 mb-2">{t("inventory.formatsCount", { count: String(product.variants!.length) })}</p>
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
                        {t("inventory.edit")}
                      </button>
                      {!hasVariants && (
                        <button
                          onClick={() => { setEditingProductId(product.id); setEditingQuantity(product.quantity.toString()); }}
                          className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium text-blue-600 transition-colors"
                        >
                          <Package size={14} />
                          {t("inventory.stock")}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-medium text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        {t("inventory.delete")}
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

      {/* Close productos tab fragment */}
      </>)}

      {/* ── MOVEMENTS TAB ─────────────────────────────────────────── */}
      {activeTab === "movimientos" && (
        <div className="space-y-4">

          {/* Filters */}
          <Card>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("inventory.mov.product")}</label>
                <select
                  value={movFilterProduct}
                  onChange={(e) => setMovFilterProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                >
                  <option value="">{t("inventory.mov.allProducts")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("inventory.mov.movementType")}</label>
                <select
                  value={movFilterType}
                  onChange={(e) => setMovFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                >
                  <option value="">{t("inventory.mov.allTypes")}</option>
                  <option value="sale">{t("inventory.mov.typeSale")}</option>
                  <option value="restock">{t("inventory.mov.typeRestock")}</option>
                  <option value="adjustment">{t("inventory.mov.typeAdjustment")}</option>
                  <option value="return">{t("inventory.mov.typeReturn")}</option>
                  <option value="damage">{t("inventory.mov.typeDamage")}</option>
                  <option value="initial">{t("inventory.mov.typeInitial")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("inventory.mov.from")}</label>
                <input
                  type="date"
                  value={movFilterFrom}
                  onChange={(e) => setMovFilterFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("inventory.mov.to")}</label>
                <input
                  type="date"
                  value={movFilterTo}
                  onChange={(e) => setMovFilterTo(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                />
              </div>
              <Button
                onClick={() => fetchMovements({
                  product_id:    movFilterProduct || undefined,
                  movement_type: movFilterType || undefined,
                  from_date:     movFilterFrom || undefined,
                  to_date:       movFilterTo || undefined,
                })}
              >
                <RotateCcw className="w-4 h-4" />
                {t("inventory.mov.filter")}
              </Button>
              {(movFilterProduct || movFilterType || movFilterFrom || movFilterTo) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMovFilterProduct("");
                    setMovFilterType("");
                    setMovFilterFrom("");
                    setMovFilterTo("");
                    fetchMovements();
                  }}
                >
                  {t("inventory.mov.clear")}
                </Button>
              )}
            </div>
          </Card>

          {/* Movements List */}
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-bold text-slate-800">
                  {t("inventory.mov.title")}
                  {movementsTotal > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">({movementsTotal} {t("inventory.mov.total")})</span>
                  )}
                </p>
              </div>
            </div>

            {movementsLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">{t("inventory.mov.loading")}</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">{t("inventory.mov.empty")}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {t("inventory.mov.emptyDesc")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {movements.map((mv) => {
                  const isIn = mv.quantity_change > 0;
                  const typeLabels: Record<string, { label: string; color: string }> = {
                    sale:       { label: t("inventory.mov.typeSale"),       color: "bg-red-100 text-red-700" },
                    restock:    { label: t("inventory.mov.typeRestock"),    color: "bg-green-100 text-green-700" },
                    adjustment: { label: t("inventory.mov.typeAdjustment"), color: "bg-blue-100 text-blue-700" },
                    return:     { label: t("inventory.mov.typeReturn"),     color: "bg-purple-100 text-purple-700" },
                    damage:     { label: t("inventory.mov.typeDamage"),     color: "bg-orange-100 text-orange-700" },
                    initial:    { label: t("inventory.mov.typeInitial"),    color: "bg-slate-100 text-slate-600" },
                  };
                  const typeInfo = typeLabels[mv.movement_type] ?? { label: mv.movement_type, color: "bg-slate-100 text-slate-600" };

                  const dateStr = new Date(mv.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  const timeStr = new Date(mv.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit", minute: "2-digit",
                  });

                  return (
                    <div key={mv.id} className="px-4 py-3 hover:bg-slate-50 flex items-center gap-4">
                      {/* Direction icon */}
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${isIn ? "bg-green-100" : "bg-red-100"}`}>
                        {isIn
                          ? <TrendingUp className="w-4 h-4 text-green-600" />
                          : <TrendingDown className="w-4 h-4 text-red-600" />
                        }
                      </div>

                      {/* Product + variant */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {mv.product_name}
                          {mv.variant_label && (
                            <span className="ml-1.5 text-xs font-normal text-slate-500">({mv.variant_label})</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {mv.reference_id && (
                            <span className="text-xs text-slate-400 font-mono">{mv.reference_id}</span>
                          )}
                          {mv.notes && (
                            <span className="text-xs text-slate-500 italic truncate max-w-[200px]">"{mv.notes}"</span>
                          )}
                        </div>
                      </div>

                      {/* Stock change */}
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className={`text-sm font-bold ${isIn ? "text-green-600" : "text-red-600"}`}>
                          {isIn ? "+" : ""}{mv.quantity_change}
                        </p>
                        <p className="text-xs text-slate-400">
                          {mv.quantity_before} → {mv.quantity_after}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-xs font-medium text-slate-600">{dateStr}</p>
                        <p className="text-xs text-slate-400">{timeStr}</p>
                        {mv.created_by && (
                          <p className="text-xs text-slate-400 truncate max-w-[120px]">{mv.created_by}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ADJUSTMENT MODAL ────────────────────────────────────────── */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{t("inventory.mov.adjustTitle")}</h2>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("inventory.mov.productRequired")}</label>
                <select
                  value={adjustForm.product_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value, variant_id: "" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                >
                  <option value="">{t("inventory.mov.selectProduct")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Show variant selector if product has variants */}
              {adjustForm.product_id && products.find(p => p.id === adjustForm.product_id)?.has_variants && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("inventory.mov.variantRequired")}</label>
                  <select
                    value={adjustForm.variant_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, variant_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                  >
                    <option value="">{t("inventory.mov.selectVariant")}</option>
                    {products.find(p => p.id === adjustForm.product_id)?.variants?.map((v) => (
                      <option key={v.id} value={v.id}>{v.label} (stock: {v.stock_quantity})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("inventory.mov.movementTypeRequired")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "restock",    label: t("inventory.mov.typeRestock"),    desc: t("inventory.mov.restockDesc"),    color: "border-green-300 bg-green-50 text-green-700" },
                    { id: "adjustment", label: t("inventory.mov.typeAdjustment"), desc: t("inventory.mov.adjustmentDesc"), color: "border-blue-300 bg-blue-50 text-blue-700" },
                    { id: "return",     label: t("inventory.mov.typeReturn"),     desc: t("inventory.mov.returnDesc"),     color: "border-purple-300 bg-purple-50 text-purple-700" },
                    { id: "damage",     label: t("inventory.mov.typeDamage"),     desc: t("inventory.mov.damageDesc"),     color: "border-orange-300 bg-orange-50 text-orange-700" },
                  ] as { id: "restock" | "adjustment" | "return" | "damage"; label: string; desc: string; color: string }[]).map((mt) => (
                    <button
                      key={mt.id}
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, movement_type: mt.id })}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        adjustForm.movement_type === mt.id
                          ? mt.color + " border-current"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-bold">{mt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{mt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("inventory.mov.quantityRequired")}
                  <span className="font-normal text-slate-400 ml-1">
                    ({adjustForm.movement_type === "damage" ? t("inventory.mov.willDeduct") : t("inventory.mov.willAdd")})
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm"
                  placeholder={t("inventory.mov.quantityPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("inventory.mov.notes")}</label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white text-sm h-16 resize-none"
                  placeholder={t("inventory.mov.notesPlaceholder")}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1"
                >
                  {t("inventory.cancel")}
                </Button>
                <Button
                  onClick={handleAdjustStock}
                  className="flex-1"
                >
                  {t("inventory.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      </Section>
    </Container>
  );
}
