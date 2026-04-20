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
        // Don't select a category by default - display all products
        setSelectedCategory(null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error cargando productos");
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
    : Object.values(productsByCategory).flat();

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
      setMessage("No hay tenant seleccionado.");
      setMessageType("error");
      return;
    }

    if (cart.length === 0) {
      setMessage("El carrito está vacío.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      await POSService.createTransaction(tenantId, cart, paymentMethod, "cashier-001", discount);
      setCart([]);
      setDiscount(0);
      setMessage("✓ ¡Venta registrada exitosamente!");
      setMessageType("success");
      const refreshed = await POSService.fetchProducts(tenantId);
      setProducts(refreshed);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error en la transacción";
      
      // Check if this is a migration error
      if (errorMsg.includes("MIGRATION_REQUIRED") || errorMsg.includes("discount column")) {
        setMessage(
          "⚠️ La base de datos necesita ser actualizada. " +
          "Por favor verifica FIX_DISCOUNT_MIGRATION.md para las instrucciones."
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
          <h1 className="text-3xl font-bold text-gray-900">Caja - Nueva Venta</h1>
          <p className="text-sm text-slate-600 mt-1">Selecciona productos, ajusta cantidades y finaliza la venta.</p>
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
          <Card>
            {loading ? (
              <p className="text-gray-800">Cargando...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-800">No hay categorías disponibles. Primero crea una categoría en el inventario.</p>
            ) : (
              <>
                {/* Category Dropdown */}
                <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                  <label className="text-sm font-semibold text-slate-700 md:whitespace-nowrap">Categorías</label>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                  >
                    <option value="">Todos los productos</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({productsByCategory[cat.id]?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Products Grid */}
                {displayedProducts.length === 0 ? (
                  <p className="text-gray-800 text-center py-8">
                    Sin productos en esta categoría.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {displayedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-2.5 border border-slate-200 rounded bg-white shadow-xs hover:shadow-sm transition"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-600 line-clamp-1">{product.description}</p>
                            )}
                            <p className="mt-1.5 text-base font-bold text-blue-600">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Stock: {product.quantity}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAddProduct(product)}
                            disabled={product.quantity <= 0}
                            className="mt-auto text-sm py-1.5"
                          >
                            {product.quantity > 0 ? "Agregar" : "Agotado"}
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
          <Card title="Resumen de Venta">
            <div className="space-y-2">
              <div className="border-b pb-2">
                {cart.length === 0 ? (
                  <p className="text-xs text-gray-800 text-center">Carrito vacío</p>
                ) : (
                  cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-xs font-medium text-slate-900">
                            {item.quantity} × {product?.name || "Producto"}
                          </p>
                          <p className="text-xs text-slate-600">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-900">{formatCurrency(item.total)}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotal.subtotal)}</span>
                </div>
                
                {/* Discount field */}
                <div className="border-t pt-1 mt-1">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Descuento ($)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    min="0"
                    max={cartTotal.subtotal}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900"
                    placeholder="0.00"
                  />
                  {discount > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      -{formatCurrency(cartTotal.discount)} ({(((cartTotal.discount as number) / cartTotal.subtotal) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>

                {cartTotal.discount > 0 && (
                  <div className="flex justify-between text-xs text-slate-600 pt-0.5">
                    <span>Después de descuento</span>
                    <span>{formatCurrency(cartTotal.subtotalAfterDiscount)}</span>
                  </div>
                )}
                
                {taxes.length > 0 ? (
                  <>
                    {taxes.map((tax) => (
                      <div key={tax.id} className="flex justify-between text-xs text-slate-600">
                        <span>{tax.name} ({tax.rate}%)</span>
                        <span>{formatCurrency((cartTotal.taxes as any)[tax.name] || 0)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Sin impuestos configurados.{" "}
                    <a href="/dashboard/settings/taxes" className="text-blue-600 hover:underline">
                      Configurar
                    </a>
                  </p>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal.total)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-900"
                >
                  <option value="CASH">EFFECTIVO</option>
                  <option value="CARD">TARJETA</option>
                  <option value="TRANSFER">TRANSFERENCIA</option>
                </select>

                <Button
                  onClick={handleCompleteSale}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={cart.length === 0 || loading}
                >
                  {loading ? "Procesando..." : "Completar Venta"}
                </Button>
                <Button
                  className="w-full"
                  size="sm"
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
