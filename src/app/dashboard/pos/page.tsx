"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ShoppingCart, RefreshCw } from "lucide-react";
import { POSService } from "@/features/pos/services";
import { TaxService, type Tax } from "@/features/taxes/services";
import { LoyaltyService } from "@/features/loyalty/services";
import { CartItem, Product, LoyalCustomer, LoyalCustomerStats, Transaction } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { useAuth } from "@/context/AuthContext";
import { Button, Alert, Card, Container, Section } from "@/components/StripeUIComponents";
import { PageIcon, SearchInput, DashboardHeader, IconButton, Dialog, DialogFooter, ReceiptModal, type ReceiptSettings } from "@/components";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER";
type Currency = "NIO" | "USD";

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
  cost_price?: number;
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
  const discountInputRef = useRef<HTMLInputElement>(null);
  const amountReceivedInputRef = useRef<HTMLInputElement>(null);
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
  
  // Receipt states
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({});

  // Currency states
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NIO");
  const [usdExchangeRate, setUsdExchangeRate] = useState<number>(37.00);
  
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

    // Load tenant settings (exchange rate + receipt info)
    fetch(`/api/tenants/${tenantId}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.usdExchangeRate) {
          setUsdExchangeRate(data.usdExchangeRate);
        }
        setReceiptSettings({
          companyName: data.companyName || undefined,
          companyPhone: data.companyPhone || undefined,
          companyRuc: data.companyRuc || undefined,
          logoUrl: data.logoUrl || undefined,
        });
      })
      .catch(console.error);
  }, [tenantId]);

  // Load loyal customers when module is enabled or search changes
  useEffect(() => {
    if (!tenantId || !loyaltyModuleEnabled || !showLoyalCustomerModal) return;

    const timer = setTimeout(() => {
      setLoadingLoyalCustomers(true);
      LoyaltyService.getCustomers(tenantId, loyalCustomerSearch)
        .then((customers) => setLoyalCustomers(customers))

        .finally(() => setLoadingLoyalCustomers(false));
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [tenantId, loyaltyModuleEnabled, loyalCustomerSearch, showLoyalCustomerModal]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("posViewMode", viewMode);
  }, [viewMode]);

  // Prevent mouse wheel from changing discount and amount received values
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const inputs = [discountInputRef.current, amountReceivedInputRef.current].filter(Boolean);
    
    inputs.forEach((input) => {
      if (input) {
        input.addEventListener("wheel", handleWheel, { passive: false });
      }
    });

    return () => {
      inputs.forEach((input) => {
        if (input) {
          input.removeEventListener("wheel", handleWheel);
        }
      });
    };
  }, []);

  const cartTotal = useMemo(
    () => {
      const baseTotal = POSService.calculateCartTotal(cart);
      
      // Convert discount from selected currency to NIO (base currency)
      let discountInNio = discount;
      if (selectedCurrency === "USD" && usdExchangeRate > 0) {
        discountInNio = discount * usdExchangeRate; // Convert USD discount to NIO
      }
      
      // Apply discount
      const discountAmount = Math.min(discountInNio, baseTotal.subtotal);
      const subtotalAfterDiscount = baseTotal.subtotal - discountAmount;
      
      // Calculate cost of goods sold (COGS)
      const costOfGoodsSold = cart.reduce((sum, item) => {
        const itemCost = item.cost_price || 0;
        return sum + (itemCost * item.quantity);
      }, 0);

      if (taxes.length === 0) {
        const totalAmount = subtotalAfterDiscount;
        const profit = totalAmount - costOfGoodsSold;
        return { 
          subtotal: baseTotal.subtotal,
          discount: discountAmount,
          subtotalAfterDiscount,
          tax: 0, 
          total: subtotalAfterDiscount, 
          taxes: {},
          costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        };
      }
      const taxCalculations = TaxService.calculateTaxes(subtotalAfterDiscount, taxes);
      const totalAmount = taxCalculations.total;
      const profit = totalAmount - costOfGoodsSold;
      return {
        subtotal: baseTotal.subtotal,
        discount: discountAmount,
        subtotalAfterDiscount,
        tax: 0,
        total: totalAmount,
        taxes: Object.fromEntries(
          taxes.map((tax) => [tax.name, taxCalculations[tax.name] || 0])
        ),
        costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
        profit: Math.round(profit * 100) / 100,
      };
    },
    [cart, taxes, discount, selectedCurrency, usdExchangeRate]
  );

  // Helper to convert amount based on selected currency
  const convertAmount = (amount: number): number => {
    if (selectedCurrency === "USD" && usdExchangeRate > 0) {
      return amount / usdExchangeRate;
    }
    return amount;
  };

  // Get currency symbol based on selected currency
  const getCurrencySymbol = (): string => {
    return selectedCurrency === "USD" ? "$" : "C$";
  };

  // Format amount with correct currency symbol
  const fmtCurrency = (amount: number): string => {
    const converted = convertAmount(amount);
    const formatted = fmt(converted); // This adds the locale formatting but includes C$
    
    if (selectedCurrency === "USD") {
      // Remove C$ and add $ instead
      return formatted.replace("C$", "$");
    }
    // For NIO, fmt() already includes C$
    return formatted;
  };

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Calculate change (vuelto) for cash payments
  const changeCalculation = useMemo(() => {
    // cartTotal.total is always in NIO (base currency)
    const totalInNio = cartTotal.total;
    
    // Convert amountReceived to NIO based on selected currency
    let amountReceivedInNio = amountReceived;
    if (selectedCurrency === "USD" && usdExchangeRate > 0) {
      amountReceivedInNio = amountReceived * usdExchangeRate; // USD to NIO
    }
    
    const change = amountReceivedInNio - totalInNio;
    return {
      amountReceived,
      change: change < 0 ? 0 : change,
      isInsufficientAmount: amountReceived > 0 && change < 0,
      isExactAmount: amountReceived > 0 && change === 0,
    };
  }, [amountReceived, cartTotal.total, selectedCurrency, usdExchangeRate]);

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
    
    // Ensure names are never empty for proper report generation
    const productName = product.name?.trim() || "Producto sin nombre";
    const variantLabel = variant?.label?.trim() || "";
    const itemName = variant 
      ? `${productName}${variantLabel ? ` — ${variantLabel}` : ""}`
      : productName;
    
    const itemPrice = variant ? variant.price : product.price;
    const itemCost = variant ? (variant.cost_price || 0) : (product.cost_price || 0);
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
          cost_price: itemCost,
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

    // Validate amount received is required for CASH payments
    if (paymentMethod === "CASH") {
      if (amountReceived === 0 || amountReceived < 0) {
        setMessage("Monto Recibido es obligatorio para pagos en efectivo.");
        setMessageType("error");
        return;
      }

      // Check if payment is sufficient
      if (changeCalculation.isInsufficientAmount) {
        setMessage("Monto insuficiente. El cliente debe pagar más.");
        setMessageType("error");
        return;
      }
    }

    try {
      setLoading(true);
      const cashierName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
      
      // Determine amounts based on currency selection
      let paymentMethodToUse: PaymentMethod = paymentMethod;
      let usdAmountToPass = 0;
      let currencyToPass: Currency = selectedCurrency;
      
      if (selectedCurrency === "USD") {
        usdAmountToPass = amountReceived; // amountReceived is in USD
      }
      
      const transaction = await POSService.createTransaction(
        tenantId, 
        cart, 
        paymentMethodToUse, 
        user?.id || "cashier-001", 
        discount, 
        cashierName, 
        amountReceived,
        currencyToPass,
        usdAmountToPass,
        usdExchangeRate
      );
      
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
      setSelectedCurrency("NIO");
      setSelectedLoyalCustomer(null);
      setIsCartOpen(false); // Close cart drawer on mobile after successful sale
      setMessage("✓ ¡Venta registrada exitosamente!");
      setMessageType("success");

      // Show receipt modal
      setLastTransaction(transaction);
      setShowReceipt(true);

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
    <div className="min-h-screen bg-slate-50">
      <Container>
        <DashboardHeader
          pageType="pos"
          title="Caja"
        >
          {/* Cart toggle button — hidden on lg (cart always visible) */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="btn-primary 2xl:hidden relative flex items-center gap-2"
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

          {/* Refresh button to reload inventory values */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center justify-center"
            title="Recargar Caja"
            aria-label="Recargar Caja"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </DashboardHeader>

        {message ? (
          <div className="fixed top-10 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
            <div className="pointer-events-auto max-w-md w-full">
              <Alert
                variant={messageType === "success" ? "success" : "warning"}
                title={messageType === "success" ? "✓ Éxito" : "⚠ Aviso"}
                className="shadow-lg"
              >
                {message}
              </Alert>
            </div>
          </div>
        ) : null}

        {/* Products + Cart side-by-side on lg */}
        <div className="2xl:flex 2xl:gap-6 2xl:items-start">

        {/* Products */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Card>
            {/* Toolbar */}
            <div className="flex flex-col gap-2 p-4 border-b border-slate-200 bg-slate-50 -m-6 mb-0 rounded-t-lg">
              {/* Line 1: Search + View Mode */}
              <div className="flex gap-2">
                {/* Search */}
                <SearchInput
                  value={search}
                  onChange={(value) => setSearch(value)}
                  placeholder="Buscar producto..."
                  className="flex-1"
                />

                {/* View Mode Toggle */}
                <div className="flex gap-1 bg-slate-200 rounded-lg p-1 flex-shrink-0">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors leading-none ${
                      viewMode === "list"
                        ? "btn-primary"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>Lista</span>
                  </button>
                  <button
                    onClick={() => setViewMode("card")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors leading-none ${
                      viewMode === "card"
                        ? "btn-primary"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
                    </svg>
                    <span>Tarjetas</span>
                  </button>
                </div>
              </div>

              {/* Line 2: Category filter — dropdown */}
              <div className="flex gap-2">
                <select
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products content */}
            <div className="p-4">

            {productsLoading ? (
              <div className={viewMode === "card" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3" : "w-full"}>
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
              <p className="text-slate-500 text-center py-12">Sin resultados.</p>
            ) : viewMode === "card" ? (
              // CARD VIEW
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 auto-rows-max">
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
                    className={`rounded-lg border border-slate-200 overflow-hidden transition-all hover:shadow-lg hover:border-slate-300 flex flex-col h-full ${
                      outOfStock && !hasVariants ? "opacity-50" : ""
                    }`}
                  >
                    {/* Image placeholder */}
                    <div className="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative group flex-shrink-0">
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
                    <div className="p-1.5 sm:p-2.5 bg-white space-y-2 flex-1 flex flex-col">
                      {/* Product name */}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-xs sm:text-sm line-clamp-2">{product.name}</p>
                        {category && (
                          <p className="text-xs text-slate-500 truncate">{category.name}</p>
                        )}
                      </div>

                      {/* Product details */}
                      <div>
                        {/* Empty space */}
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
                                className={`py-1 px-1.5 rounded-lg text-xs font-semibold transition-colors truncate ${
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
            <div className="px-4 py-2 border-t border-slate-100 text-sm text-slate-400 bg-slate-50">
              {displayedProducts.length} producto{displayedProducts.length !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          // LIST VIEW
          <>
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white text-xs sm:text-sm font-semibold uppercase tracking-wide">
                  <th className="px-2 sm:px-4 py-2 sm:py-2.5 text-left text-white">Producto</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-2.5 text-left hidden md:table-cell text-white">Categoría</th>
                  <th className="w-full"></th>
                  <th className="px-2 sm:px-4 py-2 sm:py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row) => {
                  if (row.type === "header") {
                    return (
                      <tr key={`header-${row.catId}`} className="bg-slate-100 border-t-2 border-slate-200">
                        <td colSpan={4} className="px-2 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                      className={`group transition-colors text-xs sm:text-sm ${outOfStock && !hasVariants ? "opacity-50" : "hover:bg-blue-50"}`}
                    >
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2.5 min-w-0 max-w-0 overflow-hidden">
                        <p className="font-medium text-slate-900 truncate text-xs sm:text-sm">{product.name}</p>
                        {product.description && (
                          <p className="text-xs sm:text-sm text-slate-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2.5 hidden md:table-cell">
                        {category ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700">
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="w-full"></td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2.5 text-right min-w-0">
                        {hasVariants ? (
                          /* Inline format buttons — price + stock visible */
                          <div className="flex flex-col gap-1 sm:gap-1.5 items-stretch">
                            {variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((variant) => {
                              const inCartV = cart.find((i) => i.variantId === variant.id);
                              const vOut = variant.stock_quantity <= 0;
                              return (
                                <button
                                  key={variant.id}
                                  disabled={vOut}
                                  onClick={() => !vOut && handleAddProduct(product, variant)}
                                  className={`flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-lg transition-colors text-xs sm:text-sm truncate ${
                                    vOut
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                      : inCartV
                                      ? "bg-purple-700 text-white ring-2 ring-purple-400"
                                      : "bg-purple-100 text-purple-800 hover:bg-purple-600 hover:text-white"
                                  }`}
                                >
                                  <span className="font-semibold leading-tight truncate">
                                    {inCartV ? `${inCartV.quantity}× ` : ""}{variant.label} ({fmt(variant.price)})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : outOfStock ? (
                          <span className="text-xs sm:text-sm text-slate-400 font-medium">Agotado</span>
                        ) : stockReached ? (
                          <span className="text-xs sm:text-sm text-amber-600 font-medium">Máx. {product.quantity}</span>
                        ) : (
                          <button
                            onClick={() => handleAddProduct(product)}
                            className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors truncate"
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="truncate">{inCart ? `${inCart.quantity}×` : fmt(product.price)}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-2 sm:px-4 py-2 border-t border-slate-100 text-xs sm:text-sm text-slate-400 bg-slate-50">
              {displayedProducts.length} producto{displayedProducts.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
            </div>
          </Card>
        </div>

        {/* Cart — drawer on < lg, always visible on lg */}
        <div className="2xl:flex-shrink-0 2xl:sticky 2xl:top-0 2xl:w-full 2xl:max-w-sm">

          {/* Backdrop — mobile only */}
          {isCartOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 2xl:hidden"
              onClick={() => setIsCartOpen(false)}
            />
          )}

          {/* Cart panel */}
          <Card className={`fixed right-0 top-0 h-screen z-50 transform transition-transform duration-300 ease-in-out flex flex-col
            w-[90vw] max-w-md
            2xl:relative 2xl:top-0 2xl:h-screen 2xl:translate-x-0 2xl:rounded-lg 2xl:z-auto 2xl:flex 2xl:flex-col 2xl:overflow-hidden
            ${
              isCartOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg lg:rounded-t-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 7h12.8M7 13H5.4M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm text-white">Carrito</h2>
              {user && (
                <p className="text-xs text-white">Cajero: {user.firstName} {user.lastName}</p>
              )}
            </div>
            {cartItemCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full ml-2">
                {cartItemCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors 2xl:hidden"
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
            <p className="text-sm text-slate-500 text-center mt-8">Carrito vacío</p>
          ) : (
            cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return (
                <div key={item.variantId ?? item.productId} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.quantity} × {item.name || product?.name || "Producto"}
                    </p>
                    <p className="text-sm text-slate-600">{fmtCurrency(item.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{fmtCurrency(item.total)}</p>
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

          {/* Cart summary & actions — now inside scrollable area */}
          <div className="pt-4 space-y-3 border-t border-slate-200">
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{fmtCurrency(cartTotal.subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="border-t pt-1 mt-1">
                <label className="text-sm font-semibold text-slate-600 block mb-1">Descuento ({getCurrencySymbol()})</label>
                <input
                  ref={discountInputRef}
                  type="number"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDiscount(0);
                    } else {
                      const num = Number(val);
                      if (!isNaN(num) && num >= 0) {
                        setDiscount(num);
                      }
                    }
                  }}
                  max={cartTotal.subtotal}
                  step="0.01"
                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-slate-900"
                  placeholder="0.00"
                />
                {discount > 0 && (
                  <p className="text-sm text-blue-600 mt-0.5">
                    -{fmtCurrency(cartTotal.discount)} ({(((cartTotal.discount as number) / cartTotal.subtotal) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>

              {cartTotal.discount > 0 && (
                <div className="flex justify-between text-sm text-slate-600 pt-0.5">
                  <span>Después de descuento</span>
                  <span>{fmtCurrency(cartTotal.subtotalAfterDiscount)}</span>
                </div>
              )}

              {taxes.length > 0 ? (
                taxes.map((tax) => (
                  <div key={tax.id} className="flex justify-between text-sm text-slate-600">
                    <span>{tax.name} ({tax.rate}%)</span>
                    <span>{fmtCurrency((cartTotal.taxes as any)[tax.name] || 0)}</span>
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
                <span>{fmtCurrency(cartTotal.total)}</span>
              </div>

              {/* Profit Summary */}
              {(cartTotal as any).costOfGoodsSold !== undefined && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                  <div className="text-xs text-slate-600 mb-1 font-semibold">Análisis de ganancia:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-600">Costo total</p>
                      <p className="font-bold text-slate-900">{fmtCurrency((cartTotal as any).costOfGoodsSold)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Ganancia</p>
                      <p className="font-bold text-green-700">{fmtCurrency((cartTotal as any).profit)}</p>
                    </div>
                  </div>
                </div>
              )}
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
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-bold rounded-lg transition-colors shadow-md text-center"
                  >
                    Agregar Cliente Fiel
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

            {/* Currency selector — only show for CASH payments */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Moneda de Pago</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCurrency("NIO")}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors ${
                      selectedCurrency === "NIO"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    NIO (Córdoba)
                  </button>
                  <button
                    onClick={() => setSelectedCurrency("USD")}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors ${
                      selectedCurrency === "USD"
                        ? "bg-green-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
                
                {/* Exchange rate info */}
                {selectedCurrency === "USD" && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-semibold text-green-700 uppercase mb-1">Tasa de Cambio</p>
                    <p className="text-sm text-green-900">
                      1 USD = <span className="font-bold">{fmt(usdExchangeRate)}</span>
                    </p>
                    <p className="text-xs text-green-700 mt-2">
                      Total en USD: <span className="font-semibold">${fmt(convertAmount(cartTotal.total))}</span>
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Total en NIO: <span className="font-semibold">{fmt(cartTotal.total)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Vuelto (Change) calculation — only for CASH payments */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <label htmlFor="amountReceived" className="text-sm font-semibold text-slate-700 block">
                  Monto Recibido ({selectedCurrency === "USD" ? "$" : "C$"})
                </label>
                <input
                  ref={amountReceivedInputRef}
                  id="amountReceived"
                  type="number"
                  value={amountReceived === 0 ? "" : amountReceived}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setAmountReceived(0);
                    } else {
                      const num = Number(val);
                      if (!isNaN(num) && num >= 0) {
                        setAmountReceived(num);
                      }
                    }
                  }}
                  step="0.01"
                  placeholder="0.00"
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
          </div>
        </div>

        {/* Action buttons — fixed at bottom */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white space-y-2 flex-shrink-0">
          <Button
            onClick={handleCompleteSale}
            className="w-full"
            disabled={cart.length === 0 || loading}
          >
            {loading ? "Procesando..." : "Completar Venta"}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
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
          </Card>
        </div>
        </div>

      {/* Loyal Customer Modal */}
      <Dialog
        isOpen={showLoyalCustomerModal}
        title="Seleccionar Cliente Fiel"
        onClose={() => setShowLoyalCustomerModal(false)}
        maxWidth="md"
        scrollable={true}
      >
        <div>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o tarjeta..."
            value={loyalCustomerSearch}
            onChange={(e) => setLoyalCustomerSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
          />
        </div>

        <div className="space-y-2">
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

        <div className="flex gap-2">
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
                className="btn-primary w-full"
              >
                + Crear Nuevo Cliente
              </button>
        </div>
      </Dialog>

      {/* Create Loyal Customer Modal */}
      <Dialog
        isOpen={showCreateLoyalCustomerModal}
        title="Crear Cliente Fiel"
        onClose={() => setShowCreateLoyalCustomerModal(false)}
        maxWidth="md"
      >
        <form onSubmit={handleCreateLoyalCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Número de Tarjeta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newLoyalCustomerForm.card_number}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const cardNumber = await generateUniqueCardNumber();
                      if (cardNumber) {
                        setNewLoyalCustomerForm({ ...newLoyalCustomerForm, card_number: cardNumber });
                      }
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm transition"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={newLoyalCustomerForm.name}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={newLoyalCustomerForm.phone}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  placeholder="+505 8765 4321"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Correo</label>
                <input
                  type="email"
                  value={newLoyalCustomerForm.email}
                  onChange={(e) =>
                    setNewLoyalCustomerForm({ ...newLoyalCustomerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary whitespace-nowrap"
                >
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
      </Dialog>

      {/* Receipt Modal — shown after a successful sale */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={lastTransaction}
        settings={receiptSettings}
        fmt={fmt}
      />
      </Container>
      </div>
    );
}
