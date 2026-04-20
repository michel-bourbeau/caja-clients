"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";
import { POSService } from "@/features/pos/services";
import { TaxService, type Tax } from "@/features/taxes/services";
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
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const [productsData, categoriesData, taxesData] = await Promise.all([
          POSService.fetchProducts(tenantId),
          fetch(`/api/tenants/${tenantId}/categories`).then((res) => res.json()),
          TaxService.fetchTaxes(tenantId),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
        setTaxes(taxesData);
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

  const cartTotal = useMemo(
    () => {
      const baseTotal = POSService.calculateCartTotal(cart);
      
      // Apply discount
      const discountAmount = Math.min(discount, baseTotal.subtotal);
      const subtotalAfterDiscount = baseTotal.subtotal - discountAmount;
      
      if (taxes.length === 0) {
        return { 
          subtotal: baseTotal.subtotal,
          discount: discountAmount,
          subtotalAfterDiscount,
          tax: 0, 
          total: subtotalAfterDiscount, 
          taxes: {} 
        };
      }
      const taxCalculations = TaxService.calculateTaxes(subtotalAfterDiscount, taxes);
      return {
        subtotal: baseTotal.subtotal,
        discount: discountAmount,
        subtotalAfterDiscount,
        tax: 0,
        total: taxCalculations.total,
        taxes: Object.fromEntries(
          taxes.map((tax) => [tax.name, taxCalculations[tax.name] || 0])
        ),
      };
    },
    [cart, taxes, discount]
  );

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
          name: product.name,
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
      setMessageType("error");
      return;
    }

    if (cart.length === 0) {
      setMessage("Le panier est vide.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      await POSService.createTransaction(tenantId, cart, paymentMethod, "cashier-001", discount);
      setCart([]);
      setDiscount(0);
      setMessage("✓ Vente enregistrée avec succès!");
      setMessageType("success");
      const refreshed = await POSService.fetchProducts(tenantId);
      setProducts(refreshed);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erreur lors de la transaction";
      
      // Check if this is a migration error
      if (errorMsg.includes("MIGRATION_REQUIRED") || errorMsg.includes("discount column")) {
        setMessage(
          "⚠️ La base de données doit être mise à jour. " +
          "Veuillez vérifier FIX_DISCOUNT_MIGRATION.md pour les instructions."
        );
      } else {
        setMessage(errorMsg);
      }
      
      setMessageType("error");
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
        <div className={`mb-6 rounded border p-4 ${
          messageType === "success"
            ? "border-green-300 bg-green-50 text-green-900"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}>
          {message}
        </div>
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
                
                {/* Discount field */}
                <div className="border-t pt-2 mt-2">
                  <label className="text-sm font-semibold text-slate-600 block mb-1">Rabais ($)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    min="0"
                    max={cartTotal.subtotal}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    placeholder="0.00"
                  />
                  {discount > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      -{formatCurrency(cartTotal.discount)} ({(((cartTotal.discount as number) / cartTotal.subtotal) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>

                {cartTotal.discount > 0 && (
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Après rabais</span>
                    <span>{formatCurrency(cartTotal.subtotalAfterDiscount)}</span>
                  </div>
                )}
                
                {taxes.length > 0 ? (
                  <>
                    {taxes.map((tax) => (
                      <div key={tax.id} className="flex justify-between text-slate-600">
                        <span>{tax.name} ({tax.rate}%)</span>
                        <span>{formatCurrency((cartTotal.taxes as any)[tax.name] || 0)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Aucune taxe configurée.{" "}
                    <a href="/dashboard/settings/taxes" className="text-blue-600 hover:underline">
                      Configurer les taxes
                    </a>
                  </p>
                )}
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
