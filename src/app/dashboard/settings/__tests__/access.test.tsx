/**
 * Settings — Tests de contrôle d'accès
 *
 * Vérifie pour chaque page du module settings :
 *  1. Redirige vers /login si l'utilisateur n'est pas connecté
 *  2. Redirige vers /dashboard si l'utilisateur n'a pas la permission settings.view
 *  3. Affiche la page correctement quand l'utilisateur est autorisé
 *
 * Vérifie également que la page principale affiche les liens de navigation vers
 * tous les sous-modules (taxes, taux de change, thème, fidélisation, modules).
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Shared mock setup ────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/settings",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: "es-ni",
    setLocale: jest.fn(),
    setTenantDefault: jest.fn(),
  }),
}));

jest.mock("@/context/TenantFeaturesContext", () => {
  const features = { pos: true, inventory: true, employees: true, schedules: true, payroll: true, reports: true, loyalty: true, taxes: true, settings: true, contacts: true, expenses: true };
  return { useTenantFeatures: () => ({ features, loading: false, error: null }) };
});

jest.mock("@/lib/utils/tenantFeatures", () => {
  const features = { loyalty: true };
  return { useTenantFeatures: () => ({ features, loading: false, error: null }) };
});

jest.mock("@/lib/utils/tenant", () => ({ useTenantId: jest.fn(() => "tenant-123") }));
jest.mock("@/lib/utils/useCurrency", () => ({
  useCurrency: () => ({ fmt: (v: number) => `C$ ${v}`, currency: "NIO", symbol: "C$" }),
  broadcastCurrencyChange: jest.fn(),
}));
jest.mock("@/lib/hooks/usePaymentStatus", () => ({
  usePaymentStatus: () => ({ paymentStatus: { isSuspended: false }, loading: false }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    settings: { fontSize: "normal", themeColor: "blue", logoUrl: "" },
    updateTheme: jest.fn(),
    setPreviewTheme: jest.fn(),
    loading: false,
  }),
  FONT_SIZE_MAP: { small: 14, normal: 16, large: 18 },
}));

jest.mock("@/context/TenantContext", () => ({
  useTenant: () => ({ tenantId: "tenant-123" }),
}));

jest.mock("@/features/loyalty/services", () => ({
  LoyaltyService: { getSettings: jest.fn() },
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Button:      ({ children, onClick, disabled, loading, variant }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card:        ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader:  ({ children }: any) => <div>{children}</div>,
  CardTitle:   ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  Alert:       ({ children, title, variant }: any) => <div role="alert">{title}{children}</div>,
  Section:     ({ title, description }: any) => <div><h1>{title}</h1>{description && <p>{description}</p>}</div>,
  Container:   ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui", () => ({
  Card:    ({ children }: any) => <div>{children}</div>,
  Button:  ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Input:   (props: any) => <input {...props} />,
}));

jest.mock("@/components/LoadingSpinner", () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}));

jest.mock("@/components/ThemeFontSizeSettings", () => ({
  ThemeFontSizeSettings: () => <div data-testid="theme-font-size" />,
}));

jest.mock("@/components", () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
  PageIcon: () => null,
}));

jest.mock("@/lib/utils/formatters", () => ({
  formatDateTime: (d: any) => String(d),
  toNicaraguaDateString: (d: any) => String(d),
}));

import { useAuth } from "@/context/AuthContext";
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeUser(permissions: string[] = []) {
  return {
    id: "user-1",
    firstName: "Test",
    roleId: "manager",
    permissions,
    hasPermission: (p: string) => permissions.includes(p),
  } as any;
}

function setupGlobalFetch() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ plan: "basic", history: [] }),
    blob: () => Promise.resolve(new Blob()),
    headers: { get: () => "" },
  }) as jest.Mock;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockClear();
  setupGlobalFetch();
  if (typeof window !== "undefined") {
    window.localStorage.setItem("tenantId", "tenant-123");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / page principale", () => {
  let SettingsPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../page");
    SettingsPage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });

  it("affiche le lien vers /dashboard/settings/modules", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings/modules"]');
      expect(link).not.toBeNull();
    });
  });

  it("affiche le lien vers /dashboard/settings/taxes", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings/taxes"]');
      expect(link).not.toBeNull();
    });
  });

  it("affiche le lien vers /dashboard/settings/exchange-rate", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings/exchange-rate"]');
      expect(link).not.toBeNull();
    });
  });

  it("affiche le lien vers /dashboard/settings/theme", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings/theme"]');
      expect(link).not.toBeNull();
    });
  });

  it("affiche le lien vers /dashboard/settings/loyalty", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings/loyalty"]');
      expect(link).not.toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXCHANGE-RATE SUB-PAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / exchange-rate", () => {
  let ExchangeRatePage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../exchange-rate/page");
    ExchangeRatePage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ExchangeRatePage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ExchangeRatePage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ExchangeRatePage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });

  it("affiche la cl\u00e9 i18n du titre de la page", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ExchangeRatePage />);
    await waitFor(() => expect(screen.getByText("settings.exchangeRate.pageTitle")).toBeInTheDocument());
  });

  it("affiche le lien de retour vers /dashboard/settings", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ExchangeRatePage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings"]');
      expect(link).not.toBeNull();
    });
  });
});
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / taxes", () => {
  let TaxesPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../taxes/page");
    TaxesPage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<TaxesPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<TaxesPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<TaxesPage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THEME SUB-PAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / theme", () => {
  let ThemePage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../theme/page");
    ThemePage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ThemePage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ThemePage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ThemePage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });

  it("affiche la cl\u00e9 i18n du titre de la page", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ThemePage />);
    await waitFor(() => expect(screen.getByText("settings.theme.pageTitle")).toBeInTheDocument());
  });

  it("affiche la cl\u00e9 i18n du titre de la carte de taille de police", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ThemePage />);
    await waitFor(() => expect(screen.getByText("settings.theme.fontSizeCardTitle")).toBeInTheDocument());
  });
});
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / loyalty", () => {
  let LoyaltyPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../loyalty/page");
    LoyaltyPage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<LoyaltyPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<LoyaltyPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view", "loyalty.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<LoyaltyPage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });

  it("affiche la cl\u00e9 i18n du titre de la page", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view", "loyalty.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<LoyaltyPage />);
    await waitFor(() => expect(screen.getByText("settings.loyalty.pageTitle")).toBeInTheDocument());
  });

  it("affiche le lien de retour vers /dashboard/settings", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view", "loyalty.view"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<LoyaltyPage />);
    await waitFor(() => {
      const link = document.querySelector('a[href="/dashboard/settings"]');
      expect(link).not.toBeNull();
    });
  });
});
// ─────────────────────────────────────────────────────────────────────────────

describe("Settings / modules", () => {
  let ModulesPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../modules/page");
    ModulesPage = mod.default;
  });

  it("redirige vers /login si utilisateur non connecté", async () => {
    mockUseAuth.mockReturnValue({ user: null, hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ModulesPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("redirige vers /dashboard si permission settings.view manquante", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["pos.view"]), hasPermission: jest.fn(), logout: jest.fn() } as any);
    render(<ModulesPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("affiche la page si l'utilisateur a settings.view", async () => {
    mockUseAuth.mockReturnValue({ user: makeUser(["settings.view", "settings.edit"]), hasPermission: jest.fn(() => true), logout: jest.fn() } as any);
    render(<ModulesPage />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});
