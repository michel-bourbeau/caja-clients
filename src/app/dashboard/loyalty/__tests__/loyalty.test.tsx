/**
 * Dashboard / Loyalty — Tests unitaires
 *
 * Couvre les deux pages du module fidélisation :
 *  1. /dashboard/loyalty        — Liste des clients fidèles
 *  2. /dashboard/loyalty/[id]   — Détail d'un client fidèle
 *
 * Vérifie :
 *  - Rendu de base (titre i18n, éléments clés visibles)
 *  - État vide (liste vide, pas de récompenses, pas d'achats)
 *  - Rendu avec données (tableau clients, progression de récompense)
 *  - Traduction : les clés i18n sont affichées (t(key) => key)
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Shared mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ customerId: "customer-abc" }),
  usePathname: () => "/dashboard/loyalty",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: "es-ni",
    setLocale: jest.fn(),
    setTenantDefault: jest.fn(),
  }),
}));

jest.mock("@/lib/utils/tenant", () => ({
  useTenantId: jest.fn(() => "tenant-123"),
}));

jest.mock("@/lib/utils/useCurrency", () => ({
  useCurrency: () => ({
    fmt: (v: number) => `C$ ${v}`,
    currency: "NIO",
    symbol: "C$",
  }),
  broadcastCurrencyChange: jest.fn(),
}));

jest.mock("@/context/TenantFeaturesContext", () => {
  const features = {
    pos: true, inventory: true, employees: true, schedules: true,
    payroll: true, reports: true, loyalty: true, taxes: true,
    settings: true, contacts: true, expenses: true,
  };
  return { useTenantFeatures: () => ({ features, loading: false, error: null }) };
});

jest.mock("@/lib/utils/tenantFeatures", () => {
  const features = { loyalty: true };
  return { useTenantFeatures: () => ({ features, loading: false, error: null }) };
});

jest.mock("@/components/FeatureGuard", () => ({
  FeatureGuard: ({ children }: any) => <>{children}</>,
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Button:      ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Container:   ({ children }: any) => <div>{children}</div>,
  Section:     ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui", () => ({
  Button:  ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card:    ({ children }: any) => <div>{children}</div>,
  Input:   (props: any) => <input {...props} />,
}));

jest.mock("@/components", () => ({
  DashboardHeader:     ({ title, subtitle, children }: any) => (
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}{children}</div>
  ),
  SearchInput:         ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  PageIcon:            () => null,
  IconButton:          ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Dialog:              ({ isOpen, title, children, footer }: any) =>
    isOpen ? <div role="dialog"><h2>{title}</h2>{children}{footer}</div> : null,
  DialogFooter:        ({ children }: any) => <div>{children}</div>,
  FlashMessage:        ({ flash }: any) =>
    flash ? <div role="alert">{flash.message}</div> : null,
  useFlash:            () => ({
    flash: null,
    showFlash: jest.fn(),
    clearFlash: jest.fn(),
  }),
  EmptyState:          ({ state, message }: any) =>
    state === "loading"
      ? <div data-testid="loading-state">Loading...</div>
      : <div data-testid="empty-state">{message || "empty"}</div>,
  DeleteConfirmDialog: ({ isOpen, message, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div role="dialog">
        <p>{message}</p>
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onCancel}>cancel</button>
      </div>
    ) : null,
}));

// ─── Mock LoyaltyService ──────────────────────────────────────────────────────

const mockGetCustomers = jest.fn();
const mockCreateCustomer = jest.fn();
const mockDeleteCustomer = jest.fn();
const mockGetCustomerDetails = jest.fn();
const mockGetRewardHistory = jest.fn();
const mockGetPurchaseHistory = jest.fn();
const mockGetLoyaltySettings = jest.fn();
const mockAwardReward = jest.fn();
const mockCalculateRewardProgress = jest.fn();

jest.mock("@/features/loyalty/services", () => ({
  LoyaltyService: {
    getCustomers:          (...args: any[]) => mockGetCustomers(...args),
    createCustomer:        (...args: any[]) => mockCreateCustomer(...args),
    deleteCustomer:        (...args: any[]) => mockDeleteCustomer(...args),
    getCustomerDetails:    (...args: any[]) => mockGetCustomerDetails(...args),
    getRewardHistory:      (...args: any[]) => mockGetRewardHistory(...args),
    getPurchaseHistory:    (...args: any[]) => mockGetPurchaseHistory(...args),
    getLoyaltySettings:    (...args: any[]) => mockGetLoyaltySettings(...args),
    awardReward:           (...args: any[]) => mockAwardReward(...args),
    calculateRewardProgress: (...args: any[]) => mockCalculateRewardProgress(...args),
  },
}));

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleCustomers = [
  {
    id: "c1",
    name: "Juan Pérez",
    card_number: "12345",
    phone: "+505 1234 5678",
    email: "juan@test.com",
    total_accumulated: 5000,
    total_visits: 12,
    current_counter: 1500,
  },
  {
    id: "c2",
    name: "María López",
    card_number: "67890",
    phone: null,
    email: null,
    total_accumulated: 2500,
    total_visits: 6,
    current_counter: 800,
  },
];

const sampleCustomerStats = {
  id: "customer-abc",
  name: "Juan Pérez",
  card_number: "12345",
  phone: "+505 1234 5678",
  email: "juan@test.com",
  total_accumulated: 5000,
  total_visits: 12,
  current_counter: 1500,
  last_reward_date: null,
};

const sampleLoyaltySettings = {
  loyalty_reward_threshold: 2000,
  loyalty_reward_type: "DISCOUNT_PERCENT",
  loyalty_reward_value: 10,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: fetch returns available card number
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ available: true }),
    ok: true,
  }) as any;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOYALTY LIST PAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard / loyalty — liste", () => {
  let LoyaltyPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../page");
    LoyaltyPage = mod.default;
  });

  it("affiche le titre i18n de la page", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.list.pageTitle")).toBeInTheDocument()
    );
  });

  it("affiche le sous-titre i18n", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.list.subtitle")).toBeInTheDocument()
    );
  });

  it("affiche le bouton nouveau client", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.list.newCustomerBtn")).toBeInTheDocument()
    );
  });

  it("affiche le champ de recherche avec la clé placeholder", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() => {
      const input = screen.getByTestId("search-input");
      expect(input).toHaveAttribute("placeholder", "loyalty.list.searchPlaceholder");
    });
  });

  it("affiche l'état vide quand il n'y a pas de clients", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    );
  });

  it("affiche la clé i18n emptyList pour une liste vide sans recherche", async () => {
    mockGetCustomers.mockResolvedValue([]);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.list.emptyList")).toBeInTheDocument()
    );
  });

  it("affiche les noms des clients quand la liste est chargée", async () => {
    mockGetCustomers.mockResolvedValue(sampleCustomers);
    render(<LoyaltyPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Juan Pérez").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("María López").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche les en-têtes de colonne traduits", async () => {
    mockGetCustomers.mockResolvedValue(sampleCustomers);
    render(<LoyaltyPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.list.colName")).toBeInTheDocument()
    );
    expect(screen.getByText("loyalty.list.colCard")).toBeInTheDocument();
    expect(screen.getByText("loyalty.list.colTotalSpent")).toBeInTheDocument();
    expect(screen.getByText("loyalty.list.colVisits")).toBeInTheDocument();
    expect(screen.getByText("loyalty.list.colActions")).toBeInTheDocument();
  });

  it("affiche les boutons Supprimer pour chaque client", async () => {
    mockGetCustomers.mockResolvedValue(sampleCustomers);
    render(<LoyaltyPage />);
    await waitFor(() => {
      const deleteBtns = screen.getAllByText("loyalty.list.deleteBtn");
      expect(deleteBtns.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOYALTY CUSTOMER DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard / loyalty — détail client", () => {
  let CustomerDetailPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../[customerId]/page");
    CustomerDetailPage = mod.default;
  });

  beforeEach(() => {
    mockGetCustomerDetails.mockResolvedValue(sampleCustomerStats);
    mockGetRewardHistory.mockResolvedValue([]);
    mockGetPurchaseHistory.mockResolvedValue([]);
    mockGetLoyaltySettings.mockResolvedValue(sampleLoyaltySettings);
    mockCalculateRewardProgress.mockReturnValue({
      percentage: 75,
      remainingAmount: 500,
    });
  });

  it("affiche le lien de retour i18n", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.backLink")).toBeInTheDocument()
    );
  });

  it("affiche le lien href /dashboard/loyalty", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/loyalty"]');
      expect(link).not.toBeNull();
    });
  });

  it("affiche le nom du client après chargement", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    );
  });

  it("affiche le titre i18n du progres de récompense", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.rewardProgressTitle")).toBeInTheDocument()
    );
  });

  it("affiche le titre i18n de l'historique des récompenses", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.rewardsHistoryTitle")).toBeInTheDocument()
    );
  });

  it("affiche le message i18n quand il n'y a pas de récompenses", async () => {
    mockGetRewardHistory.mockResolvedValue([]);
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.noRewards")).toBeInTheDocument()
    );
  });

  it("affiche le titre i18n de l'historique des achats", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.purchasesHistoryTitle")).toBeInTheDocument()
    );
  });

  it("affiche le message i18n quand il n'y a pas d'achats", async () => {
    mockGetPurchaseHistory.mockResolvedValue([]);
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.noPurchases")).toBeInTheDocument()
    );
  });

  it("affiche le bouton Éditer", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.editBtn")).toBeInTheDocument()
    );
  });

  it("affiche le bouton Récompense", async () => {
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getAllByText("loyalty.detail.rewardBtn").length).toBeGreaterThanOrEqual(1)
    );
  });

  it("affiche 'Cliente no encontrado' si les données client sont null", async () => {
    mockGetCustomerDetails.mockResolvedValue(null);
    render(<CustomerDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("loyalty.detail.notFound")).toBeInTheDocument()
    );
  });
});
