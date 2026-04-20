"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";
import { POSService } from "@/features/pos/services";
import { CartItem, Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { useTenantId } from "@/lib/utils/tenant";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export default function POSPage() {
  const tenantId = useTenantId();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const fetched = await POSService.fetchProducts(tenantId);
        setProducts(fetched);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur de chargement des produits");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [tenantId]);

  const cartTotal = useMemo(() => POSService.calculateCartTotal(cart), [cart]);

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
          <h1 className="text-3xl font-bold text-slate-900">Nueva Venta</h1>
          <p className="text-sm text-slate-600 mt-1">Sélectionnez des produits, ajustez les quantités et finalisez la vente.</p>
        </div>
        <Button variant="secondary" disabled>
          Transacciones Anteriores
        </Button>
      </div>

      {message ? (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">{message}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Productos">
            {loading ? (
              <p className="text-slate-500">Chargement des produits...</p>
            ) : products.length === 0 ? (
              <p className="text-slate-500">Aucun produit disponible pour ce tenant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex flex-col h-full">
                      <div className="mb-3">
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-600">{product.category || "Sans catégorie"}</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(product.price)}</p>
                        <p className="text-xs text-slate-500">Stock: {product.quantity}</p>
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
          </Card>
        </div>

        <div>
          <Card title="Resumen de Venta">
            <div className="space-y-4">
              <div className="border-b pb-4">
                {cart.length === 0 ? (
                  <p className="text-slate-500">Aucun article dans le panier.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium text-slate-900">{item.quantity} × {item.productId}</p>
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
                  ))
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
                  <option value="CASH">EFECTIVO</option>
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
