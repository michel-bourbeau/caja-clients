import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import ProfitsPage from "../page";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { TransactionService } from "@/features/transactions/services";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/utils/tenant");
jest.mock("@/lib/utils/useCurrency");

jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "profits.title": "Análisis de Ganancias",
        "profits.subtitle": "Monitoree sus ganancias por período, producto y categoría",
        "profits.loading": "Cargando...",
        "profits.refresh": "Actualizar",
        "profits.periodWeek": "Semana",
        "profits.periodMonth": "Mes",
        "profits.periodYear": "Año",
        "profits.periodWeekOf": "Semana de",
        "profits.tabSummary": "Resumen",
        "profits.tabByProduct": "Por Producto",
        "profits.tabByCategory": "Por Categoría",
        "profits.tabPeriods": "Períodos",
        "profits.cardTransactions": "Transacciones",
        "profits.cardRevenue": "Ingresos Totales",
        "profits.cardCost": "Costo Total",
        "profits.cardProfit": "Ganancia Total",
        "profits.refundLabel": "remb.",
        "profits.avgProfit": "Ganancia Promedio por Venta",
        "profits.avgMargin": "Margen Promedio",
        "profits.byPaymentMethod": "Por Método de Pago",
        "profits.transactions": "transacciones",
        "profits.margin": "Margen",
        "profits.colDate": "Fecha",
        "profits.colProduct": "Producto",
        "profits.colQty": "Cantidad",
        "profits.colRevenue": "Ingresos",
        "profits.colCost": "Costo",
        "profits.colProfit": "Ganancia",
        "profits.colMargin": "Margen",
        "profits.colCategory": "Categoría",
        "profits.colPeriod": "Período",
        "profits.noData": "No hay datos disponibles",
        "profits.groupDay": "Día",
        "profits.groupWeek": "Semana",
        "profits.groupMonth": "Mes",
        "profits.groupYear": "Año",
      };
      return map[key] ?? key;
    },
    language: "es-ni",
  }),
}));

jest.mock("@/lib/utils/formatters", () => ({
  toNicaraguaDateString: (date: any) => {
    const d = date instanceof Date ? date : new Date(String(date));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
}));

jest.mock("@/features/transactions/services", () => ({
  TransactionService: {
    fetchTransactions: jest.fn(),
  },
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Container: ({ children }: any) => <div>{children}</div>,
  Section: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ButtonGroup", () => ({
  ButtonGroup: ({ options, value, onChange }: any) => (
    <div>
      {options.map((opt: any) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          data-testid={`period-type-${opt.id}`}
          aria-pressed={value === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@/components", () => ({
  DashboardHeader: ({ title, subtitle }: any) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
  PageIcon: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dashboard/profits",
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockUseTenantId = useTenantId as jest.MockedFunction<typeof useTenantId>;
const mockUseCurrency = useCurrency as jest.MockedFunction<typeof useCurrency>;
const mockFetchTransactions = TransactionService.fetchTransactions as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
//
// tx-1  CASH  → Café   price=100 cost=60  qty=2  rev=200 cogs=120 profit=80
// tx-2  CARD  → Pan    price=50  cost=20  qty=3  rev=150 cogs=60  profit=90
// ─────────────────────────────────────────────────────────────────────────────
// totals: revenue=350, cogs=180, profit=170, avgProfit=85, avgMargin≈48.6%
// payment methods: CASH profit=80, CARD profit=90
// by-product sorted desc: Pan(90), Café(80)
// by-category sorted desc: Panadería(90), Bebidas(80)
// period (day): both on 2026-04-28 → revenue=350, cogs=180, profit=170, count=2

const mockTransactions = [
  {
    id: "tx-1",
    paymentMethod: "CASH",
    timestamp: "2026-04-28T12:00:00Z",
    items: [
      { productId: "p1", name: "Café", price: 100, cost_price: 60, quantity: 2, category: "Bebidas" },
    ],
  },
  {
    id: "tx-2",
    paymentMethod: "CARD",
    timestamp: "2026-04-28T18:00:00Z",
    items: [
      { productId: "p2", name: "Pan", price: 50, cost_price: 20, quantity: 3, category: "Panadería" },
    ],
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProfitsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTenantId.mockReturnValue("tenant-123");
    mockUseCurrency.mockReturnValue({
      fmt: (value: number) => String(value),
      currency: "NIO",
      symbol: "C$",
    } as any);
    mockFetchTransactions.mockResolvedValue(mockTransactions);
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("renders the page title", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("Análisis de Ganancias")).toBeInTheDocument();
      });
    });

    it("renders all 4 navigation tabs", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("Resumen")).toBeInTheDocument();
        expect(screen.getByText("Por Producto")).toBeInTheDocument();
        expect(screen.getByText("Por Categoría")).toBeInTheDocument();
        expect(screen.getByText("Períodos")).toBeInTheDocument();
      });
    });

    it("renders period type selector (Semana / Mes / Año)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByTestId("period-type-week")).toBeInTheDocument();
        expect(screen.getByTestId("period-type-month")).toBeInTheDocument();
        expect(screen.getByTestId("period-type-year")).toBeInTheDocument();
      });
    });

    it("renders Actualizar button", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("Actualizar")).toBeInTheDocument();
      });
    });
  });

  // ── Data fetching ────────────────────────────────────────────────────────────

  describe("Data fetching", () => {
    it("fetches transactions on mount with tenantId only (no date args — client-side filtering)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(mockFetchTransactions).toHaveBeenCalledWith("tenant-123");
      });
    });

    it("does not fetch when tenantId is null", async () => {
      mockUseTenantId.mockReturnValue(null);
      render(<ProfitsPage />);
      // Allow all microtasks to flush
      await new Promise((r) => setTimeout(r, 0));
      expect(mockFetchTransactions).not.toHaveBeenCalled();
    });

    it("shows loading state while the request is in-flight", () => {
      // Never-resolving promise keeps the loading state active
      mockFetchTransactions.mockReturnValue(new Promise(() => {}));
      render(<ProfitsPage />);
      expect(screen.getAllByText("Cargando...").length).toBeGreaterThanOrEqual(1);
    });

    it("shows error alert when fetch rejects with an Error", async () => {
      mockFetchTransactions.mockRejectedValue(new Error("Network error"));
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows generic error message for non-Error rejections", async () => {
      mockFetchTransactions.mockRejectedValue("Unknown");
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("Error loading data")).toBeInTheDocument();
      });
    });

    it("refetches when Actualizar is clicked", async () => {
      render(<ProfitsPage />);
      await waitFor(() => expect(mockFetchTransactions).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByText("Actualizar"));
      await waitFor(() => expect(mockFetchTransactions).toHaveBeenCalledTimes(2));
    });
  });

  // ── Summary tab calculations ─────────────────────────────────────────────────

  describe("Summary tab – calculations", () => {
    it("shows correct total transaction count (2)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Transacciones").closest("div")!;
        expect(within(card).getByText("2")).toBeInTheDocument();
      });
    });

    it("shows correct total revenue (100×2 + 50×3 = 350)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Ingresos Totales").closest("div")!;
        expect(within(card).getByText("350")).toBeInTheDocument();
      });
    });

    it("shows correct total COGS (60×2 + 20×3 = 180)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Costo Total").closest("div")!;
        expect(within(card).getByText("180")).toBeInTheDocument();
      });
    });

    it("shows correct total profit (350 − 180 = 170)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Ganancia Total").closest("div")!;
        expect(within(card).getByText("170")).toBeInTheDocument();
      });
    });

    it("shows correct average profit per sale (170 / 2 = 85)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Ganancia Promedio por Venta").closest("div")!;
        expect(within(card).getByText("85")).toBeInTheDocument();
      });
    });

    it("shows correct average margin ((170/350)×100 ≈ 48.6%)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("48.6%")).toBeInTheDocument();
      });
    });

    it("shows payment method breakdown with CASH and CARD", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        expect(screen.getByText("CASH")).toBeInTheDocument();
        expect(screen.getByText("CARD")).toBeInTheDocument();
      });
    });

    it("shows correct CASH profit (80) and CARD profit (90)", async () => {
      render(<ProfitsPage />);
      await waitFor(() => {
        const cashRow = screen.getByText("CASH").closest("div")!.parentElement!;
        expect(within(cashRow).getByText("80")).toBeInTheDocument();

        const cardRow = screen.getByText("CARD").closest("div")!.parentElement!;
        expect(within(cardRow).getByText("90")).toBeInTheDocument();
      });
    });

    it("shows zero margin and no payment breakdown when there are no transactions", async () => {
      mockFetchTransactions.mockResolvedValue([]);
      render(<ProfitsPage />);
      await waitFor(() => {
        const card = screen.getByText("Transacciones").closest("div")!;
        expect(within(card).getByText("0")).toBeInTheDocument();
        expect(screen.getByText("0.0%")).toBeInTheDocument();
        expect(screen.queryByText("CASH")).not.toBeInTheDocument();
      });
    });
  });

  // ── By Product tab ───────────────────────────────────────────────────────────

  describe("By Product tab", () => {
    beforeEach(async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Por Producto"));
      fireEvent.click(screen.getByText("Por Producto"));
    });

    it("shows product names in the table", async () => {
      await waitFor(() => {
        expect(screen.getByText("Café")).toBeInTheDocument();
        expect(screen.getByText("Pan")).toBeInTheDocument();
      });
    });

    it("shows Pan before Café (sorted by profit descending: 90 > 80)", async () => {
      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const panIdx = rows.findIndex((r) => r.textContent?.includes("Pan"));
        const cafeIdx = rows.findIndex((r) => r.textContent?.includes("Café"));
        expect(panIdx).toBeLessThan(cafeIdx);
      });
    });

    it("shows correct quantity for Café (2) and Pan (3)", async () => {
      await waitFor(() => {
        const cafeRow = screen.getByRole("row", { name: /Café/i });
        expect(within(cafeRow).getByText("2")).toBeInTheDocument();

        const panRow = screen.getByRole("row", { name: /Pan/i });
        expect(within(panRow).getByText("3")).toBeInTheDocument();
      });
    });

    it("shows correct margin for Café (40.0%) and Pan (60.0%)", async () => {
      await waitFor(() => {
        const cafeRow = screen.getByRole("row", { name: /Café/i });
        expect(within(cafeRow).getByText("40.0%")).toBeInTheDocument();

        const panRow = screen.getByRole("row", { name: /Pan/i });
        expect(within(panRow).getByText("60.0%")).toBeInTheDocument();
      });
    });
  });

  describe("By Product tab – empty state", () => {
    it("shows 'No hay datos disponibles' when there are no transactions", async () => {
      mockFetchTransactions.mockResolvedValue([]);
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Por Producto"));
      fireEvent.click(screen.getByText("Por Producto"));
      await waitFor(() => {
        expect(screen.getByText("No hay datos disponibles")).toBeInTheDocument();
      });
    });
  });

  // ── By Category tab ──────────────────────────────────────────────────────────

  describe("By Category tab", () => {
    beforeEach(async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Por Categoría"));
      fireEvent.click(screen.getByText("Por Categoría"));
    });

    it("shows category names in the table", async () => {
      await waitFor(() => {
        expect(screen.getByText("Bebidas")).toBeInTheDocument();
        expect(screen.getByText("Panadería")).toBeInTheDocument();
      });
    });

    it("shows Panadería before Bebidas (sorted by profit descending: 90 > 80)", async () => {
      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const pIdx = rows.findIndex((r) => r.textContent?.includes("Panadería"));
        const bIdx = rows.findIndex((r) => r.textContent?.includes("Bebidas"));
        expect(pIdx).toBeLessThan(bIdx);
      });
    });

    it("shows correct margin for Bebidas (40.0%) and Panadería (60.0%)", async () => {
      await waitFor(() => {
        const bRow = screen.getByRole("row", { name: /Bebidas/i });
        expect(within(bRow).getByText("40.0%")).toBeInTheDocument();

        const pRow = screen.getByRole("row", { name: /Panadería/i });
        expect(within(pRow).getByText("60.0%")).toBeInTheDocument();
      });
    });
  });

  describe("By Category tab – empty state", () => {
    it("shows 'No hay datos disponibles' when there are no transactions", async () => {
      mockFetchTransactions.mockResolvedValue([]);
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Por Categoría"));
      fireEvent.click(screen.getByText("Por Categoría"));
      await waitFor(() => {
        expect(screen.getByText("No hay datos disponibles")).toBeInTheDocument();
      });
    });
  });

  // ── Periods tab ──────────────────────────────────────────────────────────────

  describe("Periods tab", () => {
    beforeEach(async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Períodos"));
      fireEvent.click(screen.getByText("Períodos"));
    });

    it("shows grouped period key for 2026-04-28", async () => {
      await waitFor(() => {
        expect(screen.getByText("2026-04-28")).toBeInTheDocument();
      });
    });

    it("shows correct combined transaction count (2) for the period", async () => {
      await waitFor(() => {
        const row = screen.getByRole("row", { name: /2026-04-28/i });
        expect(within(row).getByText("2")).toBeInTheDocument();
      });
    });

    it("shows combined revenue (350) for the period", async () => {
      await waitFor(() => {
        const row = screen.getByRole("row", { name: /2026-04-28/i });
        expect(within(row).getByText("350")).toBeInTheDocument();
      });
    });
  });

  describe("Periods tab – empty state", () => {
    it("shows 'No hay datos disponibles' when there are no transactions", async () => {
      mockFetchTransactions.mockResolvedValue([]);
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Períodos"));
      fireEvent.click(screen.getByText("Períodos"));
      await waitFor(() => {
        expect(screen.getByText("No hay datos disponibles")).toBeInTheDocument();
      });
    });
  });

  // ── Period groupBy buttons ───────────────────────────────────────────────────

  describe("Period groupBy buttons in Períodos tab", () => {
    it("renders Día, Semana, Mes, Año groupBy buttons", async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Períodos"));
      fireEvent.click(screen.getByText("Períodos"));
      await waitFor(() => {
        // "Día" is unique to the groupBy selector (not in period type selector)
        expect(screen.getByText("Día")).toBeInTheDocument();
        // "Semana", "Mes", "Año" also appear in the period type selector → use getAllByText
        expect(screen.getAllByText("Semana").length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText("Mes").length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText("Año").length).toBeGreaterThanOrEqual(2);
      });
    });

    it("groups by month key (YYYY-MM) when Mes button is clicked", async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Períodos"));
      fireEvent.click(screen.getByText("Períodos"));
      // The groupBy "Mes" button is the second occurrence (first is the period type selector)
      await waitFor(() => expect(screen.getAllByText("Mes").length).toBeGreaterThanOrEqual(2));
      fireEvent.click(screen.getAllByText("Mes")[1]);
      await waitFor(() => {
        expect(screen.getByText("2026-04")).toBeInTheDocument();
      });
    });

    it("groups by year key (YYYY) when Año button is clicked", async () => {
      render(<ProfitsPage />);
      await waitFor(() => screen.getByText("Períodos"));
      fireEvent.click(screen.getByText("Períodos"));
      // The groupBy "Año" button is the second occurrence (first is the period type selector)
      await waitFor(() => expect(screen.getAllByText("Año").length).toBeGreaterThanOrEqual(2));
      fireEvent.click(screen.getAllByText("Año")[1]);
      await waitFor(() => {
        expect(screen.getByText("2026")).toBeInTheDocument();
      });
    });
  });

  // ── Items without cost_price ─────────────────────────────────────────────────

  describe("Transactions without cost_price", () => {
    it("treats missing cost_price as 0 (revenue = profit)", async () => {
      mockFetchTransactions.mockResolvedValue([
        {
          id: "tx-no-cost",
          paymentMethod: "CASH",
          timestamp: "2026-04-28T10:00:00Z",
          items: [{ productId: "p3", name: "Jugo", price: 50, quantity: 2, category: "Bebidas" }],
        },
      ]);
      render(<ProfitsPage />);
      await waitFor(() => {
        // revenue = 50*2 = 100, cogs = 0, profit = 100
        const profitCard = screen.getByText("Ganancia Total").closest("div")!;
        expect(within(profitCard).getByText("100")).toBeInTheDocument();
        // margin = (100/100)*100 = 100.0%
        expect(screen.getByText("100.0%")).toBeInTheDocument();
      });
    });
  });
});
