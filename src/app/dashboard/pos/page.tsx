"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";
import { POSService } from "@/features/pos/services";
import { CartItem, Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { useTenantId } from "@/lib/utils/tenant";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

interface Category {
  id: string;
  name: string;
}

export default function POSPage() {
  const tenantId = useTenantId();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          POSService.fetchProducts(tenantId),
          fetch(`/api/tenants/${tenantId}/categories`).then((res) => res.json()),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].id);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur de chargement des produits");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tenantId]);

  const cartTotal = useMemo(() => POSService.calculateCartTotal(cart), [cart]);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach((product) => {
      const catId = (product as any).category_id || "uncategorized";
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(product);
    });
    return grouped;
  }, [products]);

  const displayedProducts = selectedCategory
    ? productsByCategory[selectedCategory] || []
    : productsByCategory["uncategorized"] || [];

  const handleAddProduct = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: Number(((item.quantity + 1) * item.price).toFixed(2)),
              }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: 1,
          price: product.price,
          total: Number(product.price.toFixed(2)),
        },
      ];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const handleCompleteSale = async () => {
    if (!tenantId) {
      setMessage("Aucun tenant sélectionné.");
      return;
    }

    if (cart.length === 0) {
      setMessage("Le panier est vide.");
      return;
    }

    try {
      setLoading(true);
      await POSService.createTransaction(tenantId, cart, paymentMethod, "cashier-001");
      setCart([]);
      setMessage("Vente enregistrée avec succès !");
      const refreshed = await POSService.fetchProducts(tenantId);
      setProducts(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lors de la transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Caisse - Nouvelle Vente</h1>
          <p className="text-sm text-slate-600 mt-1">Sélectionnez des produits, ajustez les quantités et finalisez la vente.</p>
        </div>
      </div>

      {message ? (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">{message}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Produits par Catégorie">
            {loading ? (
              <p className="text-gray-800">Chargement...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-800">Aucune catégorie disponible. Créez d'abord une catégorie dans l'inventaire.</p>
            ) : (
              <>
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedCategory === cat.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {cat.name}
                      <span className="ml-2 text-xs">
                        ({productsByCategory[cat.id]?.length || 0})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                {displayedProducts.length === 0 ? (
                  <p className="text-gray-800 text-center py-8">
                    Aucun produit dans cette catégorie.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-700">{product.description}</p>
                            )}
                            <p className="mt-2 text-lg font-bold text-blue-600">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="text-xs text-gray-700">
                              Stock: {product.quantity}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAddProduct(product)}
                            disabled={product.quantity <= 0}
                            className="mt-auto"
                          >
                            {product.quantity > 0 ? "Ajouter" : "Rupture de stock"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <div>
          <Card title="Résumé de Vente">
            <div className="space-y-4">
              <div className="border-b pb-4">
                {cart.length === 0 ? (
                  <p className="text-gray-800 text-center">Panier vide</p>
                ) : (
                  cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.quantity} × {product?.name || "Produit"}
                          </p>
                          <p className="text-sm text-slate-600">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-900">{formatCurrency(item.total)}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotal.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA (21%)</span>
                  <span>{formatCurrency(cartTotal.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal.total)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                >
                  <option value="CASH">EFFECTIVO</option>
                  <option value="CARD">TARJETA</option>
                  <option value="TRANSFER">TRANSFERENCIA</option>
                </select>

                <Button
                  onClick={handleCompleteSale}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={cart.length === 0 || loading}
                >
                  {loading ? "Enregistrement..." : "Completar Venta"}
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0 || loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
