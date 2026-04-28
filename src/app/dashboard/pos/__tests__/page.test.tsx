import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import POSPage from "../page";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useAuth } from "@/context/AuthContext";
import { POSService } from "@/features/pos/services";
import { TaxService } from "@/features/taxes/services";
import { LoyaltyService } from "@/features/loyalty/services";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/utils/tenant");
jest.mock("@/lib/utils/useCurrency");
jest.mock("@/context/AuthContext");

jest.mock("@/features/pos/services", () => ({
  POSService: {
    fetchProducts: jest.fn(),
    calculateCartTotal: jest.fn((items: any[]) => {
      const subtotal = items.reduce((s: number, i: any) => s + (i.total ?? 0), 0);
      return { subtotal, tax: 0, total: subtotal };
    }),
    createTransaction: jest.fn(),
    generateTransactionId: jest.fn(() => "TX-001"),
  },
}));

jest.mock("@/features/taxes/services", () => ({
  TaxService: {
    fetchTaxes: jest.fn(),
    calculateTaxes: jest.fn((subtotal: number, taxes: any[]) => {
      const result: any = { total: subtotal };
      taxes.forEach((t: any) => {
        const amount = (subtotal * t.rate) / 100;
        result[t.name] = amount;
        result.total += amount;
      });
      return result;
    }),
  },
}));

jest.mock("@/features/loyalty/services", () => ({
  LoyaltyService: {
    getLoyaltySettings: jest.fn(),
    getCustomers: jest.fn(),
    getCustomerDetails: jest.fn(),
    createCustomer: jest.fn(),
    recordPurchase: jest.fn(),
  },
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
  Alert: ({ children, variant, title }: any) => (
    <div role="alert" data-variant={variant}>
      {title && <span>{title}</span>}
      {children}
    </div>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Container: ({ children }: any) => <div>{children}</div>,
  Section: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components", () => ({
  DashboardHeader: ({ children }: any) => (
    <div data-testid="dashboard-header">{children}</div>
  ),
  SearchInput: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  PageIcon: () => null,
  IconButton: ({ onClick, children, ...rest }: any) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
  Dialog: ({ isOpen, children, title, onClose }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose}>×</button>
        {children}
      </div>
    ) : null,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dashboard/pos",
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockUseTenantId = useTenantId as jest.MockedFunction<typeof useTenantId>;
const mockUseCurrency = useCurrency as jest.MockedFunction<typeof useCurrency>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetchProducts = POSService.fetchProducts as jest.Mock;
const mockCreateTransaction = POSService.createTransaction as jest.Mock;
const mockFetchTaxes = TaxService.fetchTaxes as jest.Mock;
const mockGetLoyaltySettings = LoyaltyService.getLoyaltySettings as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProducts = [
  {
    id: "p1",
    name: "Café",
    price: 50,
    quantity: 10,
    cost_price: 20,
    description: "Bebida caliente",
    has_variants: false,
    variants: [],
    category_id: "cat-1",
  },
  {
    id: "p2",
    name: "Pan",
    price: 20,
    quantity: 5,
    cost_price: 8,
    description: "",
    has_variants: false,
    variants: [],
    category_id: "cat-1",
  },
  {
    id: "p3",
    name: "Agua",
    price: 15,
    quantity: 0, // out of stock
    cost_price: 5,
    description: "",
    has_variants: false,
    variants: [],
    category_id: null,
  },
];

const mockCategories = [{ id: "cat-1", name: "Bebidas" }];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  mockUseTenantId.mockReturnValue("tenant-123");
  mockUseCurrency.mockReturnValue({
    fmt: (v: number) => String(v),
    symbol: "C$",
    currency: "NIO",
  } as any);
  mockUseAuth.mockReturnValue({
    user: { id: "user-1", firstName: "Juan", lastName: "Pérez", roleId: "cashier", permissions: [] },
    hasPermission: jest.fn(() => true),
    logout: jest.fn(),
  } as any);

  mockFetchProducts.mockResolvedValue(mockProducts);
  mockFetchTaxes.mockResolvedValue([]);
  mockGetLoyaltySettings.mockResolvedValue({ loyalty_module_enabled: false });
  mockCreateTransaction.mockResolvedValue({ id: "TX-001" });

  global.fetch = jest.fn((url: string) => {
    if (String(url).includes("/categories")) {
      return Promise.resolve({ json: () => Promise.resolve(mockCategories), ok: true });
    }
    if (String(url).includes("/settings")) {
      return Promise.resolve({ json: () => Promise.resolve({ usdExchangeRate: 37 }), ok: true });
    }
    return Promise.resolve({ json: () => Promise.resolve([]), ok: true });
  }) as jest.Mock;

  // localStorage defaults
  localStorage.clear();
});

// ─── Helper — wait until products are rendered ────────────────────────────────

const waitForProducts = () =>
  waitFor(() => {
    expect(screen.getByText("Café")).toBeInTheDocument();
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POSPage", () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("renders the search input", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("renders category dropdown with default option", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByRole("option", { name: "Todas las categorías" })).toBeInTheDocument();
    });

    it("renders category from API in dropdown", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByRole("option", { name: "Bebidas" })).toBeInTheDocument();
    });

    it("renders products after loading", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText("Pan")).toBeInTheDocument();
    });

    it("renders 'Agotado' for out-of-stock product", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText("Agotado")).toBeInTheDocument();
    });

    it("renders 'Carrito vacío' initially", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText("Carrito vacío")).toBeInTheDocument();
    });

    it("renders 'Completar Venta' button disabled when cart is empty", async () => {
      render(<POSPage />);
      await waitForProducts();
      const btn = screen.getByText("Completar Venta");
      expect(btn).toBeDisabled();
    });

    it("renders the cashier name in the cart panel", async () => {
      render(<POSPage />);
      await waitForProducts();
      // Multiple occurrences are expected (header + cart panel)
      expect(screen.getAllByText(/Juan Pérez/i).length).toBeGreaterThanOrEqual(1);
    });

    it("renders 'Sin impuestos.' message when no taxes configured", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText("Sin impuestos.")).toBeInTheDocument();
    });

    it("renders view mode toggle buttons (Lista / Tarjetas)", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText("Lista")).toBeInTheDocument();
      expect(screen.getByText("Tarjetas")).toBeInTheDocument();
    });
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  describe("Data fetching", () => {
    it("fetches products on mount with the tenantId", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(mockFetchProducts).toHaveBeenCalledWith("tenant-123");
    });

    it("does not fetch products when tenantId is null", async () => {
      mockUseTenantId.mockReturnValue(null);
      render(<POSPage />);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockFetchProducts).not.toHaveBeenCalled();
    });

    it("fetches taxes on mount", async () => {
      render(<POSPage />);
      await waitForProducts();
      expect(mockFetchTaxes).toHaveBeenCalledWith("tenant-123");
    });

    it("shows error alert when products fail to load", async () => {
      mockFetchProducts.mockRejectedValue(new Error("Network error"));
      render(<POSPage />);
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("renders active taxes in cart summary", async () => {
      mockFetchTaxes.mockResolvedValue([
        { id: "t1", name: "IVA", rate: 15, is_active: true },
      ]);
      render(<POSPage />);
      await waitForProducts();
      expect(screen.getByText(/IVA \(15%\)/)).toBeInTheDocument();
    });
  });

  // ── Cart — adding products ─────────────────────────────────────────────────

  describe("Cart – adding products", () => {
    it("adds a product to cart when its button is clicked", async () => {
      render(<POSPage />);
      await waitForProducts();

      // Button shows the product price ("50") before adding
      const addBtn = screen.getByRole("button", { name: /^50$/ });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText(/1 × Café/)).toBeInTheDocument();
      });
    });

    it("shows cart item count badge after adding a product", async () => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));

      await waitFor(() => {
        const badges = screen.getAllByText("1");
        // At least one badge should be present (cart item count)
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("increments quantity when the same product is added twice", async () => {
      render(<POSPage />);
      await waitForProducts();

      const addBtn = screen.getByRole("button", { name: /^50$/ });
      fireEvent.click(addBtn);
      await waitFor(() => screen.getByText(/1 × Café/));
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText(/2 × Café/)).toBeInTheDocument();
      });
    });

    it("does not add product beyond stock limit", async () => {
      // Pan has stock=5
      render(<POSPage />);
      await waitForProducts();

      const addBtn = screen.getByRole("button", { name: /^20$/ });
      // Click 6 times (stock = 5)
      for (let i = 0; i < 6; i++) fireEvent.click(addBtn);

      await waitFor(() => {
        // Quantity should be capped at 5
        expect(screen.getByText(/5 × Pan/)).toBeInTheDocument();
        expect(screen.queryByText(/6 × Pan/)).not.toBeInTheDocument();
      });
    });

    it("enables 'Completar Venta' button after adding a product", async () => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));

      await waitFor(() => {
        expect(screen.getByText("Completar Venta")).not.toBeDisabled();
      });
    });
  });

  // ── Cart — removing products ───────────────────────────────────────────────

  describe("Cart – removing products", () => {
    const addCafé = async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText(/1 × Café/));
    };

    it("removes an item when 'Eliminar' is clicked", async () => {
      await addCafé();
      fireEvent.click(screen.getByText("Eliminar"));
      await waitFor(() => {
        expect(screen.queryByText(/1 × Café/)).not.toBeInTheDocument();
        expect(screen.getByText("Carrito vacío")).toBeInTheDocument();
      });
    });

    it("clears cart when 'Cancelar' button is clicked", async () => {
      await addCafé();
      fireEvent.click(screen.getByText("Cancelar"));
      await waitFor(() => {
        // Cart item disappears, but product still shows in the list
        expect(screen.queryByText(/1 × Café/)).not.toBeInTheDocument();
        expect(screen.getByText("Carrito vacío")).toBeInTheDocument();
      });
    });
  });

  // ── Search / filter ────────────────────────────────────────────────────────

  describe("Search / filter", () => {
    it("filters products by name", async () => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.change(screen.getByTestId("search-input"), { target: { value: "Café" } });

      await waitFor(() => {
        expect(screen.getByText("Café")).toBeInTheDocument();
        expect(screen.queryByText("Pan")).not.toBeInTheDocument();
      });
    });

    it("shows 'Sin resultados.' when search has no matches", async () => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "xyzzznotfound" },
      });

      await waitFor(() => {
        expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
      });
    });

    it("filters by description as well as name", async () => {
      render(<POSPage />);
      await waitForProducts();

      // "Café" has description "Bebida caliente"
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "caliente" },
      });

      await waitFor(() => {
        expect(screen.getByText("Café")).toBeInTheDocument();
        expect(screen.queryByText("Pan")).not.toBeInTheDocument();
      });
    });
  });

  // ── Cart totals ────────────────────────────────────────────────────────────

  describe("Cart totals", () => {
    it("shows subtotal after adding a product", async () => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));

      await waitFor(() => {
        // Subtotal should be "50" (our mock fmt returns String(value))
        const subtotalRow = screen.getByText("Subtotal").closest("div")!;
        expect(within(subtotalRow).getByText("50")).toBeInTheDocument();
      });
    });

    it("shows Total label in cart summary", async () => {
      render(<POSPage />);
      await waitForProducts();

      // "Total" label is always rendered in the cart summary
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("shows tax amounts when taxes are configured", async () => {
      mockFetchTaxes.mockResolvedValue([
        { id: "t1", name: "IVA", rate: 15, is_active: true },
      ]);
      render(<POSPage />);
      await waitForProducts();

      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));

      await waitFor(() => {
        expect(screen.getByText(/IVA \(15%\)/)).toBeInTheDocument();
      });
    });
  });

  // ── Vuelto (change calculator) ─────────────────────────────────────────────

  describe("Vuelto – change calculator", () => {
    const setupWithProductInCart = async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText(/1 × Café/));
    };

    it("shows 'Monto Recibido' input for CASH payment method", async () => {
      await setupWithProductInCart();
      expect(screen.getByLabelText(/Monto Recibido/)).toBeInTheDocument();
    });

    it("hides 'Monto Recibido' input when CARD is selected", async () => {
      await setupWithProductInCart();

      // Payment method select shows "EFECTIVO" by default (value=CASH)
      fireEvent.change(screen.getByDisplayValue("EFECTIVO"), { target: { value: "CARD" } });

      await waitFor(() => {
        expect(screen.queryByLabelText(/Monto Recibido/)).not.toBeInTheDocument();
      });
    });

    it("shows 'Vuelto' when amountReceived > total", async () => {
      await setupWithProductInCart();
      // Total = 50 (Café price), amountReceived = 100 → change = 50
      fireEvent.change(screen.getByLabelText(/Monto Recibido/), {
        target: { value: "100" },
      });

      await waitFor(() => {
        // The heading "Vuelto" is unique to the change-is-positive branch
        expect(screen.getByText("Vuelto")).toBeInTheDocument();
      });
    });

    it("shows 'Monto Exacto' when amountReceived equals total", async () => {
      await setupWithProductInCart();
      fireEvent.change(screen.getByLabelText(/Monto Recibido/), {
        target: { value: "50" },
      });

      await waitFor(() => {
        expect(screen.getByText("✓ Monto Exacto")).toBeInTheDocument();
        expect(screen.getByText("Sin vuelto")).toBeInTheDocument();
      });
    });

    it("shows 'Monto Insuficiente' when amountReceived < total", async () => {
      await setupWithProductInCart();
      // Total = 50, amountReceived = 30
      fireEvent.change(screen.getByLabelText(/Monto Recibido/), {
        target: { value: "30" },
      });

      await waitFor(() => {
        expect(screen.getByText("⚠ Monto Insuficiente")).toBeInTheDocument();
      });
    });
  });

  // ── Sale validation ────────────────────────────────────────────────────────

  describe("Sale validation", () => {
    const addProductAndSelectCash = async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText("Completar Venta"));
      // CASH is already default
    };

    it("shows error when CASH payment has no amount received", async () => {
      await addProductAndSelectCash();

      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(
          screen.getByText("Monto Recibido es obligatorio para pagos en efectivo.")
        ).toBeInTheDocument();
      });
    });

    it("shows error when CASH amount is insufficient", async () => {
      await addProductAndSelectCash();

      // Total = 50, enter 30
      fireEvent.change(screen.getByLabelText(/Monto Recibido/), {
        target: { value: "30" },
      });

      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(
          screen.getByText("Monto insuficiente. El cliente debe pagar más.")
        ).toBeInTheDocument();
      });
    });

    it("does NOT validate amount received for CARD payment", async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText("Completar Venta"));

      fireEvent.change(screen.getByDisplayValue("EFECTIVO"), { target: { value: "CARD" } });
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalled();
      });
    });

    it("does NOT validate amount received for TRANSFER payment", async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText("Completar Venta"));

      fireEvent.change(screen.getByDisplayValue("EFECTIVO"), { target: { value: "TRANSFER" } });
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalled();
      });
    });
  });

  // ── Complete sale ──────────────────────────────────────────────────────────

  describe("Complete sale", () => {
    const setupReadyForSale = async (paymentMethod: "CASH" | "CARD" = "CARD") => {
      render(<POSPage />);
      await waitForProducts();

      fireEvent.click(screen.getByRole("button", { name: /^50$/ }));
      await waitFor(() => screen.getByText("Completar Venta"));

      if (paymentMethod !== "CASH") {
        // Payment method select shows "EFECTIVO" for CASH by default
        fireEvent.change(screen.getByDisplayValue("EFECTIVO"), {
          target: { value: paymentMethod },
        });
      } else {
        // Provide sufficient amount for CASH
        fireEvent.change(screen.getByLabelText(/Monto Recibido/), {
          target: { value: "100" },
        });
      }
    };

    it("calls POSService.createTransaction with tenantId and cart items", async () => {
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith(
          "tenant-123",
          expect.arrayContaining([
            expect.objectContaining({ name: "Café", quantity: 1, price: 50 }),
          ]),
          "CARD",
          "user-1",
          0,
          "Juan Pérez",
          expect.any(Number),
          expect.any(String),
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it("shows success message after completing a sale", async () => {
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/Venta registrada exitosamente/)).toBeInTheDocument();
      });
    });

    it("resets cart after successful sale", async () => {
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(screen.getByText("Carrito vacío")).toBeInTheDocument();
      });
    });

    it("re-fetches products after successful sale", async () => {
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        // 1st call = on mount, 2nd call = after sale
        expect(mockFetchProducts).toHaveBeenCalledTimes(2);
      });
    });

    it("shows error alert when transaction fails", async () => {
      mockCreateTransaction.mockRejectedValue(new Error("Transaction failed"));
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Transaction failed")).toBeInTheDocument();
      });
    });

    it("shows migration error message when discount column error occurs", async () => {
      mockCreateTransaction.mockRejectedValue(new Error("discount column MIGRATION_REQUIRED"));
      await setupReadyForSale("CARD");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/base de datos necesita ser actualizada/)).toBeInTheDocument();
      });
    });

    it("completes sale with CASH and shows success", async () => {
      await setupReadyForSale("CASH");
      fireEvent.click(screen.getByText("Completar Venta"));

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith(
          "tenant-123",
          expect.any(Array),
          "CASH",
          expect.any(String),
          0,
          expect.any(String),
          100, // amountReceived
          "NIO",
          expect.any(Number),
          37 // usdExchangeRate from settings
        );
      });
    });
  });

  // ── Payment method ─────────────────────────────────────────────────────────

  describe("Payment method selector", () => {
    it("defaults to CASH (displayed as EFECTIVO)", async () => {
      render(<POSPage />);
      await waitForProducts();
      const select = screen.getByDisplayValue("EFECTIVO") as HTMLSelectElement;
      expect(select.value).toBe("CASH");
    });

    it("can be changed to CARD", async () => {
      render(<POSPage />);
      await waitForProducts();
      const select = screen.getByDisplayValue("EFECTIVO");
      fireEvent.change(select, { target: { value: "CARD" } });
      expect((select as HTMLSelectElement).value).toBe("CARD");
    });

    it("hides currency selector when CARD is selected", async () => {
      render(<POSPage />);
      await waitForProducts();
      fireEvent.change(screen.getByDisplayValue("EFECTIVO"), { target: { value: "CARD" } });
      await waitFor(() => {
        expect(screen.queryByText("NIO (Córdoba)")).not.toBeInTheDocument();
      });
    });

    it("shows NIO / USD currency buttons for CASH payment", async () => {
      render(<POSPage />);
      await waitForProducts();
      // CASH is default
      expect(screen.getByText("NIO (Córdoba)")).toBeInTheDocument();
      expect(screen.getByText("USD ($)")).toBeInTheDocument();
    });
  });
});
