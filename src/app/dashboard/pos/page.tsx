"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { POSService } from "@/features/pos/services";
import { TaxService, type Tax } from "@/features/taxes/services";
import { LoyaltyService } from "@/features/loyalty/services";
import { CartItem, Product, LoyalCustomer, LoyalCustomerStats } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

interface Category {
  id: string;
  name: string;
}

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

export default function POSPage() {
  const tenantId = useTenantId();
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"list" | "card">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("posViewMode") as "list" | "card") || "list";
    }
    return "list";
  });
  
  // Loyalty states
  const [loyaltyModuleEnabled, setLoyaltyModuleEnabled] = useState(false);
  const [loyalCustomers, setLoyalCustomers] = useState<LoyalCustomer[]>([]);
  const [selectedLoyalCustomer, setSelectedLoyalCustomer] = useState<LoyalCustomerStats | null>(null);
  const [loyalCustomerSearch, setLoyalCustomerSearch] = useState("");
  const [showLoyalCustomerModal, setShowLoyalCustomerModal] = useState(false);
  const [showCreateLoyalCustomerModal, setShowCreateLoyalCustomerModal] = useState(false);
  const [loadingLoyalCustomers, setLoadingLoyalCustomers] = useState(false);
  const [newLoyalCustomerForm, setNewLoyalCustomerForm] = useState({
    card_number: "",
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!tenantId) return;

    // Load products first — critical path
    setProductsLoading(true);
    POSService.fetchProducts(tenantId)
      .then((data) => setProducts(data))
      .catch((err) => setMessage(err instanceof Error ? err.message : "Error cargando productos"))
      .finally(() => setProductsLoading(false));

    // Load categories + taxes in background (non-blocking)
    Promise.all([
      fetch(`/api/tenants/${tenantId}/categories`).then((res) => res.json()),
      TaxService.fetchTaxes(tenantId),
    ])
      .then(([categoriesData, taxesData]) => {
        setCategories(categoriesData);
        setTaxes(taxesData);
      })
      .catch(console.error);

    // Load loyalty settings
    LoyaltyService.getLoyaltySettings(tenantId)
      .then((settings) => setLoyaltyModuleEnabled(settings.loyalty_module_enabled))
      .catch(console.error);
  }, [tenantId]);

  // Load loyal customers when module is enabled or search changes
  useEffect(() => {
    if (!tenantId || !loyaltyModuleEnabled || !showLoyalCustomerModal) return;

    const timer = setTimeout(() => {
      setLoadingLoyalCustomers(true);
      LoyaltyService.getCustomers(tenantId, loyalCustomerSearch)
        .then((customers) => setLoyalCustomers(customers))
        .catch((err) => console.error('Error loading loyal customers:', err))
        .finally(() => setLoadingLoyalCustomers(false));
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [tenantId, loyaltyModuleEnabled, loyalCustomerSearch, showLoyalCustomerModal]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("posViewMode", viewMode);
  }, [viewMode]);

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

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Calculate change (vuelto) for cash payments
  const changeCalculation = useMemo(() => {
    const change = amountReceived - cartTotal.total;
    return {
      amountReceived,
      change: change < 0 ? 0 : change,
      isInsufficientAmount: amountReceived > 0 && change < 0,
      isExactAmount: amountReceived > 0 && change === 0,
    };
  }, [amountReceived, cartTotal.total]);

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

  // Rows for the product table — either grouped (with category header rows) or flat
  type HeaderRow = { type: "header"; catId: string; catName: string };
  type ProductRow = { type: "product"; product: Product };
  type TableRow = HeaderRow | ProductRow;

  const tableRows = useMemo((): TableRow[] => {
    // Flat mode: searching or a category is selected
    if (search.trim() || selectedCategory) {
      const base = selectedCategory
        ? productsByCategory[selectedCategory] ?? []
        : Object.values(productsByCategory).flat();
      const q = search.toLowerCase();
      const filtered = search.trim()
        ? base.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
        : base;
      return filtered.map((p) => ({ type: "product", product: p }));
    }
    // Grouped mode: no search, no category selected
    const rows: TableRow[] = [];
    const uncategorized = productsByCategory["uncategorized"] ?? [];
    if (uncategorized.length) {
      rows.push({ type: "header", catId: "uncategorized", catName: "Sin categoría" });
      uncategorized.forEach((p) => rows.push({ type: "product", product: p }));
    }
    categories.forEach((cat) => {
      const ps = productsByCategory[cat.id] ?? [];
      if (ps.length) {
        rows.push({ type: "header", catId: cat.id, catName: cat.name });
        ps.forEach((p) => rows.push({ type: "product", product: p }));
      }
    });
    return rows;
  }, [search, selectedCategory, productsByCategory, categories]);

  const displayedProducts = useMemo(() => {
    const base = selectedCategory
      ? productsByCategory[selectedCategory] ?? []
      : Object.values(productsByCategory).flat();
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [selectedCategory, productsByCategory, search]);

  const handleAddProduct = (product: Product, variant?: ProductVariant) => {
    const itemId = variant ? variant.id : product.id;
    const itemName = variant ? `${product.name} — ${variant.label}` : product.name;
    const itemPrice = variant ? variant.price : product.price;
    const itemStock = variant ? variant.stock_quantity : product.quantity;

    setCart((current) => {
      const existing = current.find((item) => (variant ? item.variantId === variant.id : (!item.variantId && item.productId === product.id)));
      if (existing) {
        if (existing.quantity >= itemStock) return current;
        return current.map((item) => {
          const matches = variant ? item.variantId === variant.id : (!item.variantId && item.productId === product.id);
          if (!matches) return item;
          return {
            ...item,
            quantity: item.quantity + 1,
            total: Number(((item.quantity + 1) * item.price).toFixed(2)),
          };
        });
      }

      return [
        ...current,
        {
          productId: product.id,
          variantId: variant ? variant.id : undefined,
          name: itemName,
          quantity: 1,
          price: itemPrice,
          total: Number(itemPrice.toFixed(2)),
        },
      ];
    });
  };

  const handleRemoveItem = (productId: string, variantId?: string) => {
    setCart((current) =>
      current.filter((item) =>
        variantId ? item.variantId !== variantId : item.productId !== productId || !!item.variantId
      )
    );
  };

  const handleSelectLoyalCustomer = async (customerId: string) => {
    try {
      if (!tenantId) return;
      const customer = await LoyaltyService.getCustomerDetails(tenantId, customerId);
      setSelectedLoyalCustomer(customer);
      setShowLoyalCustomerModal(false);
    } catch (error) {
      console.error('Error selecting loyal customer:', error);
    }
  };

  // Generate unique card number for new loyal customer
  const generateUniqueCardNumber = async (): Promise<string | null> => {
    if (!tenantId) return null;
    
    const generateRandomCard = () => {
      return Math.floor(Math.random() * 90000) + 10000;
    };

    let cardNumber = generateRandomCard().toString();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `/api/tenants/${tenantId}/loyalty/customers/check-card?card_number=${cardNumber}`
        );
        const data = await response.json();
        
        if (data.available) {
          return cardNumber;
        }
      } catch (error) {
        console.error('Error checking card:', error);
      }

      cardNumber = generateRandomCard().toString();
      attempts++;
    }

    return null;
  };

  const handleCreateLoyalCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setLoading(true);
      const newCustomer = await LoyaltyService.createCustomer(tenantId, newLoyalCustomerForm);
      
      // Select the newly created customer
      const fullCustomer = await LoyaltyService.getCustomerDetails(tenantId, newCustomer.id);
      setSelectedLoyalCustomer(fullCustomer);
      
      // Reset form and close modal
      setNewLoyalCustomerForm({ card_number: "", name: "", phone: "", email: "" });
      setShowCreateLoyalCustomerModal(false);
      
      setMessage("✓ Cliente fiel creado y seleccionado");
      setMessageType("success");
      
      // Reload customer list
      const customers = await LoyaltyService.getCustomers(tenantId);
      setLoyalCustomers(customers);

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage(error.message || "Error creando cliente fiel");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
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

    // Check if payment is CASH and amount is insufficient
    if (paymentMethod === "CASH" && changeCalculation.isInsufficientAmount) {
      setMessage("Monto insuficiente. El cliente debe pagar más.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const cashierName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
      const transaction = await POSService.createTransaction(tenantId, cart, paymentMethod, user?.id || "cashier-001", discount, cashierName);
      
      // Record purchase for loyal customer if selected
      if (loyaltyModuleEnabled && selectedLoyalCustomer) {
        try {
          await LoyaltyService.recordPurchase(tenantId, selectedLoyalCustomer.id, {
            amount: cartTotal.total,
            transaction_id: transaction.id,
            description: `Venta registrada - ${cart.length} producto(s)`,
          });
        } catch (err) {
          console.error('Error recording loyal customer purchase:', err);
        }
      }

      setCart([]);
      setDiscount(0);
      setAmountReceived(0);
      setSelectedLoyalCustomer(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Caja</h1>
        
        </div>

        {/* Cart toggle button — hidden on lg (cart always visible) */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors lg:hidden"
          aria-label="Abrir carrito"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13H5.4M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
            />
          </svg>
          <span className="text-sm font-semibold">Carrito</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-sm font-bold bg-red-500 text-white rounded-full">
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </span>
          )}
        </button>
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

      {/* Products + Cart side-by-side on lg */}
      <div className="lg:flex lg:gap-6 lg:items-start">

      {/* Products */}
      <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === "card"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
              </svg>
              Tarjetas
            </button>
          </div>

          {/* Category filter — pill buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === null
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {productsLoading ? (
          <div className={viewMode === "card" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4" : "w-full"}>
            {viewMode === "card" ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-slate-200 rounded-lg h-48 animate-pulse" />
              ))
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-3/4 mb-1" /><div className="h-3 bg-slate-100 rounded w-1/2" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto" /></td>
                      <td className="px-4 py-3 text-center"><div className="h-5 bg-slate-200 rounded-full w-10 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><div className="h-7 bg-slate-200 rounded-lg w-20 mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : displayedProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Sin resultados.</p>
        ) : viewMode === "card" ? (
          // CARD VIEW
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-max">
              {displayedProducts.map((product) => {
                const inCart = cart.find((i) => !i.variantId && i.productId === product.id);
                const category = categories.find((c) => c.id === (product as any).category_id);
                const outOfStock = product.quantity <= 0;
                const stockReached = !!inCart && inCart.quantity >= product.quantity;
                const variants: ProductVariant[] = (product as any).variants ?? [];
                const hasVariants = (product as any).has_variants && variants.length > 0;

                return (
                  <div
                    key={product.id}
                    className={`rounded-lg border border-slate-200 overflow-hidden transition-all hover:shadow-lg flex flex-col h-full ${
                      outOfStock && !hasVariants ? "opacity-50" : ""
                    }`}
                  >
                    {/* Image placeholder */}
                    <div className="w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative group flex-shrink-0">
                      {(product as any).image ? (
                        <img
                          src={(product as any).image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-slate-400 text-center px-1">Imagen</p>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-2.5 bg-white space-y-2 flex-1 flex flex-col">
                      {/* Product name */}
                      <div>
                        <p className="font-medium text-slate-900 text-sm line-clamp-2">{product.name}</p>
                        {category && (
                          <p className="text-xs text-slate-500">{category.name}</p>
                        )}
                      </div>

                      {/* Stock display */}
                      <div className="flex justify-between items-start gap-1 flex-shrink-0">
                        <div>
                          {/* Empty space - prices are on buttons now */}
                        </div>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold whitespace-nowrap ${
                          product.quantity <= 0
                            ? "bg-red-100 text-red-700"
                            : product.quantity <= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {product.quantity}
                        </span>
                      </div>

                      {/* Add to cart button */}
                      {hasVariants ? (
                        <div className="flex flex-col gap-1.5 mt-auto">
                          {variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((variant) => {
                            const inCartV = cart.find((i) => i.variantId === variant.id);
                            const vOut = variant.stock_quantity <= 0;
                            return (
                              <button
                                key={variant.id}
                                disabled={vOut}
                                onClick={() => !vOut && handleAddProduct(product, variant)}
                                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  vOut
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {variant.label} ({fmt(variant.price)})
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddProduct(product)}
                          disabled={outOfStock && !hasVariants}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors mt-auto flex-shrink-0 ${
                            outOfStock && !hasVariants
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {inCart ? `${inCart.quantity} en carrito` : outOfStock && !hasVariants ? "Agotado" : fmt(product.price)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 px-4 py-2 text-sm text-slate-400">
              {displayedProducts.length} producto{displayedProducts.length !== 1 ? "s" : ""}
            </div>
          </div>
        ) : (
          // LIST VIEW
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 text-left">Producto</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">Categoría</th>
                  <th className="px-4 py-2.5 text-center">Stock</th>
                  <th className="px-4 py-2.5 text-center w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row) => {
                  if (row.type === "header") {
                    return (
                      <tr key={`header-${row.catId}`} className="bg-slate-100 border-t-2 border-slate-200">
                        <td colSpan={5} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                          {row.catName}
                        </td>
                      </tr>
                    );
                  }
                  const { product } = row;
                  const inCart = cart.find((i) => !i.variantId && i.productId === product.id);
                  const category = categories.find((c) => c.id === (product as any).category_id);
                  const outOfStock = product.quantity <= 0;
                  const stockReached = !!inCart && inCart.quantity >= product.quantity;
                  const variants: ProductVariant[] = (product as any).variants ?? [];
                  const hasVariants = (product as any).has_variants && variants.length > 0;
                  return (
                    <tr
                      key={product.id}
                      className={`group transition-colors ${outOfStock && !hasVariants ? "opacity-50" : "hover:bg-blue-50"}`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-slate-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {category ? (
                          <span className="inline-block px-2 py-0.5 text-sm rounded-full bg-slate-100 text-slate-600 font-medium">
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {hasVariants ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((v) => (
                              <span key={v.id} className={`inline-block px-2 py-0.5 text-sm rounded-full font-semibold ${
                                v.stock_quantity <= 0 ? "bg-red-100 text-red-700" :
                                v.stock_quantity <= 5 ? "bg-amber-100 text-amber-700" :
                                "bg-green-100 text-green-700"
                              }`}>{v.stock_quantity}</span>
                            ))}
                          </div>
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
                        {hasVariants ? (
                          /* Inline format buttons — price + stock visible */
                          <div className="flex flex-col gap-1.5 items-stretch">
                            {variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((variant) => {
                              const inCartV = cart.find((i) => i.variantId === variant.id);
                              const vOut = variant.stock_quantity <= 0;
                              return (
                                <button
                                  key={variant.id}
                                  disabled={vOut}
                                  onClick={() => !vOut && handleAddProduct(product, variant)}
                                  className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg transition-colors ${
                                    vOut
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                      : inCartV
                                      ? "bg-purple-700 text-white ring-2 ring-purple-400"
                                      : "bg-purple-100 text-purple-800 hover:bg-purple-600 hover:text-white"
                                  }`}
                                >
                                  <span className="text-sm font-semibold leading-tight">
                                    {inCartV ? `${inCartV.quantity}× ` : ""}{variant.label} ({fmt(variant.price)})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : outOfStock ? (
                          <span className="text-sm text-slate-400 font-medium">Agotado</span>
                        ) : stockReached ? (
                          <span className="text-sm text-amber-600 font-medium">Máx. {product.quantity}</span>
                        ) : (
                          <button
                            onClick={() => handleAddProduct(product)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {inCart ? `${inCart.quantity}×` : fmt(product.price)}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
              {displayedProducts.length} producto{displayedProducts.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Cart — drawer on < lg, always visible on lg */}
      <div className="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-4">

        {/* Backdrop — mobile only */}
        {isCartOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsCartOpen(false)}
          />
        )}

        {/* Cart panel */}
        <div
          className={`fixed right-0 top-0 h-screen w-80 z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col
            lg:relative lg:top-auto lg:h-auto lg:translate-x-0 lg:shadow-sm lg:rounded-lg lg:border lg:border-slate-200 lg:z-auto lg:flex lg:flex-col
            ${
              isCartOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13H5.4M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Carrito</h2>
              {user && (
                <p className="text-xs text-gray-300">Cajero: {user.firstName} {user.lastName}</p>
              )}
            </div>
            {cartItemCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-sm font-bold bg-red-500 rounded-full ml-2">
                {cartItemCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded hover:bg-slate-700 transition-colors lg:hidden"
            aria-label="Cerrar carrito"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart items — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-500 text-center mt-8">Carrito vacío</p>
          ) : (
            cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return (
                <div key={item.variantId ?? item.productId} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.quantity} × {item.name || product?.name || "Producto"}
                    </p>
                    <p className="text-sm text-slate-600">{fmt(item.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{fmt(item.total)}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId, item.variantId)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart summary & actions */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{fmt(cartTotal.subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="border-t pt-1 mt-1">
              <label className="text-sm font-semibold text-slate-600 block mb-1">Descuento ({symbol})</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                min="0"
                max={cartTotal.subtotal}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                placeholder="0.00"
              />
              {discount > 0 && (
                <p className="text-sm text-blue-600 mt-0.5">
                  -{fmt(cartTotal.discount)} ({(((cartTotal.discount as number) / cartTotal.subtotal) * 100).toFixed(1)}%)
                </p>
              )}
            </div>

            {cartTotal.discount > 0 && (
              <div className="flex justify-between text-sm text-slate-600 pt-0.5">
                <span>Después de descuento</span>
                <span>{fmt(cartTotal.subtotalAfterDiscount)}</span>
              </div>
            )}

            {taxes.length > 0 ? (
              taxes.map((tax) => (
                <div key={tax.id} className="flex justify-between text-sm text-slate-600">
                  <span>{tax.name} ({tax.rate}%)</span>
                  <span>{fmt((cartTotal.taxes as any)[tax.name] || 0)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">
                Sin impuestos.{" "}
                <a href="/dashboard/settings/taxes" className="text-blue-600 hover:underline">
                  Configurar
                </a>
              </p>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-1">
              <span>Total</span>
              <span>{fmt(cartTotal.total)}</span>
            </div>
          </div>

          {/* Loyal Customer Selection — only if module is enabled */}
          {loyaltyModuleEnabled && (
            <div className="space-y-2">
              {selectedLoyalCustomer ? (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase">Cliente Fiel</p>
                      <p className="text-sm font-semibold text-purple-900">{selectedLoyalCustomer.name}</p>
                      <p className="text-xs text-purple-700">📞 {selectedLoyalCustomer.phone || "N/A"}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLoyalCustomer(null)}
                      className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-semibold"
                    >
                      Cambiar
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-purple-700">
                    <p>Tarjeta: <span className="font-semibold">{selectedLoyalCustomer.card_number}</span></p>
                    <p>Total Gastado: <span className="font-semibold">{fmt(selectedLoyalCustomer.total_accumulated)}</span></p>
                    <p>Visitas: <span className="font-semibold">{selectedLoyalCustomer.total_visits}</span></p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoyalCustomerModal(true)}
                  className="w-full px-3 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-bold rounded-lg transition-colors shadow-md"
                >
                  💳 Agregar Cliente Fiel
                </button>
              )}
            </div>
          )}

          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
          >
            <option value="CASH">EFECTIVO</option>
            <option value="CARD">TARJETA</option>
            <option value="TRANSFER">TRANSFERENCIA</option>
          </select>

          {/* Vuelto (Change) calculation — only for CASH payments */}
          {paymentMethod === "CASH" && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <label htmlFor="amountReceived" className="text-sm font-semibold text-slate-700 block">
                Monto Recibido ({symbol})
              </label>
              <input
                id="amountReceived"
                type="number"
                value={amountReceived === 0 ? "" : amountReceived}
                onChange={(e) => setAmountReceived(Math.max(0, Number(e.target.value) || 0))}
                min="0"
                step="0.01"
                placeholder="Ingrese monto"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Change display — only show when amount is entered */}
              {amountReceived > 0 && (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  {changeCalculation.isInsufficientAmount ? (
                    <div className="p-2 bg-red-100 rounded border border-red-300">
                      <p className="text-xs font-semibold text-red-700 uppercase">⚠ Monto Insuficiente</p>
                      <p className="text-sm text-red-800 font-bold">
                        Falta: {fmt(Math.abs(changeCalculation.change))}
                      </p>
                    </div>
                  ) : changeCalculation.isExactAmount ? (
                    <div className="p-2 bg-green-100 rounded border border-green-300">
                      <p className="text-xs font-semibold text-green-700 uppercase">✓ Monto Exacto</p>
                      <p className="text-sm text-green-800 font-bold">Sin vuelto</p>
                    </div>
                  ) : (
                    <div className="p-2 bg-green-100 rounded border border-green-300">
                      <p className="text-xs font-semibold text-green-700 uppercase">Vuelto</p>
                      <p className="text-lg text-green-900 font-bold">{fmt(changeCalculation.change)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cashier info */}
          {user && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase">Cajero</p>
              <p className="text-sm text-slate-900 font-medium">{user.firstName} {user.lastName}</p>
            </div>
          )}

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
            onClick={() => {
              setCart([]);
              setDiscount(0);
              setAmountReceived(0);
            }}
            disabled={cart.length === 0 || loading}
          >
            Cancelar
          </Button>
        </div>
      </div>
      </div>

      {/* Loyal Customer Modal */}
      {showLoyalCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Seleccionar Cliente Fiel</h2>
              <button
                onClick={() => setShowLoyalCustomerModal(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-200">
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o tarjeta..."
                value={loyalCustomerSearch}
                onChange={(e) => setLoyalCustomerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingLoyalCustomers ? (
                <p className="text-sm text-slate-500 text-center py-4">Cargando...</p>
              ) : loyalCustomers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay clientes</p>
              ) : (
                <div className="space-y-2">
                  {loyalCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectLoyalCustomer(customer.id)}
                      className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-600">📱 {customer.phone || "N/A"}</p>
                          <p className="text-xs text-slate-600">💳 {customer.card_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-purple-700">{fmt(customer.total_accumulated)}</p>
                          <p className="text-xs text-slate-500">{customer.total_visits} visitas</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <button
                onClick={async () => {
                  const cardNumber = await generateUniqueCardNumber();
                  if (cardNumber) {
                    setNewLoyalCustomerForm({
                      card_number: cardNumber,
                      name: "",
                      phone: "",
                      email: "",
                    });
                    setShowLoyalCustomerModal(false);
                    setShowCreateLoyalCustomerModal(true);
                  }
                }}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors"
              >
                + Crear Nuevo Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Loyal Customer Modal */}
      {showCreateLoyalCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Crear Cliente Fiel</h2>
              <button
                onClick={() => setShowCreateLoyalCustomerModal(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateLoyalCustomer} className="px-4 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Número de Tarjeta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newLoyalCustomerForm.card_number}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 text-slate-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const cardNumber = await generateUniqueCardNumber();
                      if (cardNumber) {
                        setNewLoyalCustomerForm({ ...newLoyalCustomerForm, card_number: cardNumber });
                      }
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm transition"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={newLoyalCustomerForm.name}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={newLoyalCustomerForm.phone}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
                  placeholder="+505 8765 4321"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo</label>
                <input
                  type="email"
                  value={newLoyalCustomerForm.email}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLoyalCustomerModal(false)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition"
                >
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
