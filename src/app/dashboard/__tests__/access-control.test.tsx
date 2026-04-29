/**
 * Dashboard — Tests de contrôle d'accès aux modules
 *
 * Trois dimensions testées :
 *  1. Fonctionnalités activées par le tenant (features.pos, features.reports, …)
 *  2. Permissions du rôle de l'employé (hasPermission)
 *  3. Combinaison feature + permission (les deux doivent être vrais)
 *
 * Rôles système :
 *  - Administrador : toutes les permissions
 *  - Gerente       : employés, nómina, inventario, pos (vue + cierre), reportes
 *  - Vendedor      : pos.create, pos.view, inventory.view, schedules.checkin, pos.cierre
 *  - Inconnu       : aucune permission
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import DashboardPage from "../page";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useRoleName } from "@/lib/hooks/useRoleName";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/utils/tenant");
jest.mock("@/lib/utils/useCurrency");
jest.mock("@/context/AuthContext");
jest.mock("@/lib/utils/tenantFeatures");
jest.mock("@/lib/hooks/useRoleName");

jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    t: (key: string, vars?: Record<string, string>) => {
      const esNi = require("../../../../src/i18n/locales/es-ni.json");
      const parts = key.split(".");
      let val: any = esNi;
      for (const part of parts) {
        if (val == null) return key;
        val = val[part];
      }
      if (typeof val !== "string") return key;
      if (vars) {
        return val.replace(/\{\{(\w+)\}\}/g, (_: string, name: string) => vars[name] ?? name);
      }
      return val;
    },
    locale: "es-ni",
    setLocale: jest.fn(),
    setTenantDefault: jest.fn(),
  }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/StripeUIComponents", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Container: ({ children }: any) => <div>{children}</div>,
  Section: ({ children, title }: any) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/components", () => ({
  DashboardHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p data-testid="dashboard-subtitle">{subtitle}</p>
    </div>
  ),
  PageIcon: () => null,
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

// ─── Permission sets ───────────────────────────────────────────────────────────

/** Toutes les permissions du système (rôle Administrador) */
const ADMIN_PERMISSIONS = [
  "pos.create", "pos.view", "pos.void", "pos.configure", "pos.cierre", "pos.cierre_review",
  "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.adjust",
  "manage_products",
  "employees.view", "employees.create", "employees.edit", "employees.delete",
  "schedules.view", "schedules.edit", "schedules.checkin",
  "payroll.view", "payroll.create", "payroll.approve", "payroll.pay",
  "settings.view", "settings.edit", "settings.manage_roles", "settings.manage_modules",
  "contacts.view", "contacts.create", "contacts.edit", "contacts.delete",
  "loyalty.view",
  "reports.view", "reports.export",
  "expenses.create", "expenses.view_all", "expenses.view_own", "expenses.edit", "expenses.manage_suppliers",
];

/** Permissions du rôle Gerente */
const MANAGER_PERMISSIONS = [
  "employees.view", "employees.create", "employees.edit",
  "schedules.view", "schedules.edit",
  "payroll.view", "payroll.create", "payroll.approve",
  "inventory.view",
  "pos.view", "pos.cierre", "pos.cierre_review",
  "reports.view", "reports.export",
];

/** Permissions du rôle Vendedor (Cashier) */
const CASHIER_PERMISSIONS = [
  "pos.create", "pos.view", "inventory.view", "schedules.checkin", "pos.cierre",
];

/** Toutes les fonctionnalités activées par le tenant (+ contacts explicitement) */
const ALL_FEATURES = {
  pos: true, inventory: true, employees: true,
  schedules: true, payroll: true, reports: true, loyalty: true,
  expenses: true, taxes: true, settings: true, contacts: true,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function renderDashboard(
  permissions: string[],
  features: Record<string, boolean> = ALL_FEATURES,
  loading = false,
) {
  (useTenantId as jest.Mock).mockReturnValue("tenant-123");
  (useCurrency as jest.Mock).mockReturnValue({ fmt: (v: number) => String(v), symbol: "C$", currency: "NIO" });
  (useAuth as jest.Mock).mockReturnValue({
    user: { id: "u1", firstName: "Test", lastName: "User", roleId: "test-role" },
    hasPermission: (p: string) => permissions.includes(p),
  });
  (useTenantFeatures as jest.Mock).mockReturnValue({ features, loading });
  (useRoleName as jest.Mock).mockReturnValue({ roleName: "Test Role", isLoading: false });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });

  await act(async () => {
    render(<DashboardPage />);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardPage — Access Control", () => {

  // ══════════════════════════════════════════════════════════════════
  // 1. État de chargement
  // ══════════════════════════════════════════════════════════════════
  describe("État de chargement", () => {
    it("affiche le spinner pendant le chargement des features", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, ALL_FEATURES, true);
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. Rôle Administrador — accès complet
  // ══════════════════════════════════════════════════════════════════
  describe("Rôle: Administrador", () => {
    beforeEach(() => renderDashboard(ADMIN_PERMISSIONS));

    // Groupe Ventas
    it("voit Caja", () => expect(screen.getByText("Caja")).toBeInTheDocument());
    it("voit Transacciones", () => expect(screen.getByText("Transacciones")).toBeInTheDocument());
    it("voit Cierre de Caja", () => expect(screen.getByText("Cierre de Caja")).toBeInTheDocument());
    it("voit Inventario", () => expect(screen.getByText("Inventario")).toBeInTheDocument());
    it("voit Clientes Fieles", () => expect(screen.getByText("Clientes Fieles")).toBeInTheDocument());

    // Groupe Finanzas & Reportes
    it("voit Ganancias", () => expect(screen.getByText("Ganancias")).toBeInTheDocument());
    it("voit Reportes", () => expect(screen.getByText("Reportes")).toBeInTheDocument());
    it("voit Gastos", () => expect(screen.getByText("Gastos")).toBeInTheDocument());

    // Groupe Nómina & RRHH
    it("voit Empleados", () => expect(screen.getByText("Empleados")).toBeInTheDocument());
    it("voit Asistencia", () => expect(screen.getByText("Asistencia")).toBeInTheDocument());
    it("voit Períodos", () => expect(screen.getByText("Períodos")).toBeInTheDocument());
    it("voit Recibos", () => expect(screen.getByText("Recibos")).toBeInTheDocument());

    // Groupe Administración
    it("voit Contactos", () => expect(screen.getByText("Contactos")).toBeInTheDocument());
    it("voit Impuestos", () => expect(screen.getByText("Impuestos")).toBeInTheDocument());
    it("voit Gestionar Roles", () => expect(screen.getByText("Gestionar Roles")).toBeInTheDocument());
    it("voit Configuración", () => expect(screen.getByText("Configuración")).toBeInTheDocument());

    // Compteur dans le sous-titre
    it("affiche le bon nombre de modules dans le sous-titre", () => {
      const subtitle = screen.getByTestId("dashboard-subtitle");
      expect(subtitle.textContent).toMatch(/17 módulos/);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. Rôle Gerente (Manager)
  // ══════════════════════════════════════════════════════════════════
  describe("Rôle: Gerente", () => {
    beforeEach(() => renderDashboard(MANAGER_PERMISSIONS));

    // Modules VISIBLES
    it("voit Transacciones (pos.view)", () => expect(screen.getByText("Transacciones")).toBeInTheDocument());
    it("voit Cierre de Caja (pos.cierre)", () => expect(screen.getByText("Cierre de Caja")).toBeInTheDocument());
    it("voit Inventario (inventory.view)", () => expect(screen.getByText("Inventario")).toBeInTheDocument());
    it("voit Empleados (employees.view)", () => expect(screen.getByText("Empleados")).toBeInTheDocument());
    it("voit Asistencia (schedules.view)", () => expect(screen.getByText("Asistencia")).toBeInTheDocument());
    it("voit Períodos (payroll.view)", () => expect(screen.getByText("Períodos")).toBeInTheDocument());
    it("voit Recibos (payroll.view)", () => expect(screen.getByText("Recibos")).toBeInTheDocument());
    it("voit Reportes (reports.view)", () => expect(screen.getByText("Reportes")).toBeInTheDocument());

    // Modules CACHÉS
    it("ne voit PAS Caja (manque pos.create)", () => expect(screen.queryByText("Caja")).not.toBeInTheDocument());
    it("ne voit PAS Ganancias (manque settings.manage_roles)", () => expect(screen.queryByText("Ganancias")).not.toBeInTheDocument());
    it("ne voit PAS Clientes Fieles (manque loyalty.view)", () => expect(screen.queryByText("Clientes Fieles")).not.toBeInTheDocument());
    it("ne voit PAS Gastos (manque expenses.create/view_all)", () => expect(screen.queryByText("Gastos")).not.toBeInTheDocument());
    it("ne voit PAS Gestionar Roles (manque settings.manage_roles)", () => expect(screen.queryByText("Gestionar Roles")).not.toBeInTheDocument());
    it("ne voit PAS Configuración (manque settings.view)", () => expect(screen.queryByText("Configuración")).not.toBeInTheDocument());
    it("ne voit PAS Impuestos (manque settings.manage_roles/modules)", () => expect(screen.queryByText("Impuestos")).not.toBeInTheDocument());
    it("ne voit PAS Contactos (manque contacts.view)", () => expect(screen.queryByText("Contactos")).not.toBeInTheDocument());
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. Rôle Vendedor (Cashier)
  // ══════════════════════════════════════════════════════════════════
  describe("Rôle: Vendedor (Cashier)", () => {
    beforeEach(() => renderDashboard(CASHIER_PERMISSIONS));

    // Modules VISIBLES
    it("voit Caja (pos.create)", () => expect(screen.getByText("Caja")).toBeInTheDocument());
    it("voit Transacciones (pos.view)", () => expect(screen.getByText("Transacciones")).toBeInTheDocument());
    it("voit Cierre de Caja (pos.cierre)", () => expect(screen.getByText("Cierre de Caja")).toBeInTheDocument());
    it("voit Inventario (inventory.view)", () => expect(screen.getByText("Inventario")).toBeInTheDocument());
    it("voit Asistencia (schedules.checkin)", () => expect(screen.getByText("Asistencia")).toBeInTheDocument());

    // Modules CACHÉS
    it("ne voit PAS Ganancias", () => expect(screen.queryByText("Ganancias")).not.toBeInTheDocument());
    it("ne voit PAS Reportes", () => expect(screen.queryByText("Reportes")).not.toBeInTheDocument());
    it("ne voit PAS Empleados", () => expect(screen.queryByText("Empleados")).not.toBeInTheDocument());
    it("ne voit PAS Períodos", () => expect(screen.queryByText("Períodos")).not.toBeInTheDocument());
    it("ne voit PAS Recibos", () => expect(screen.queryByText("Recibos")).not.toBeInTheDocument());
    it("ne voit PAS Gastos", () => expect(screen.queryByText("Gastos")).not.toBeInTheDocument());
    it("ne voit PAS Gestionar Roles", () => expect(screen.queryByText("Gestionar Roles")).not.toBeInTheDocument());
    it("ne voit PAS Configuración", () => expect(screen.queryByText("Configuración")).not.toBeInTheDocument());
    it("ne voit PAS Contactos", () => expect(screen.queryByText("Contactos")).not.toBeInTheDocument());
    it("ne voit PAS Impuestos", () => expect(screen.queryByText("Impuestos")).not.toBeInTheDocument());
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. Rôle inconnu — aucune permission
  // ══════════════════════════════════════════════════════════════════
  describe("Rôle inconnu / aucune permission", () => {
    it("affiche 'Sin acceso a módulos'", async () => {
      await renderDashboard([]);
      expect(screen.getByText("Sin acceso a módulos")).toBeInTheDocument();
    });

    it("n'affiche aucune carte de module", async () => {
      await renderDashboard([]);
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
      expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
      expect(screen.queryByText("Empleados")).not.toBeInTheDocument();
    });

    it("indique de contacter l'administrateur", async () => {
      await renderDashboard([]);
      expect(screen.getByText(/Contacta con tu administrador/)).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. Fonctionnalités désactivées par le tenant
  // ══════════════════════════════════════════════════════════════════
  describe("Fonctionnalités désactivées par le tenant", () => {
    it("POS désactivé → Caja, Transacciones et Cierre de Caja cachés", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, pos: false });
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
      expect(screen.queryByText("Transacciones")).not.toBeInTheDocument();
      expect(screen.queryByText("Cierre de Caja")).not.toBeInTheDocument();
    });

    it("POS désactivé → Inventario reste visible (feature séparée)", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, pos: false });
      expect(screen.getByText("Inventario")).toBeInTheDocument();
    });

    it("Inventario désactivé → Inventario caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, inventory: false });
      expect(screen.queryByText("Inventario")).not.toBeInTheDocument();
    });

    it("Reportes désactivé → Ganancias et Reportes cachés", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, reports: false });
      expect(screen.queryByText("Ganancias")).not.toBeInTheDocument();
      expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
    });

    it("Employees désactivé → Empleados et Gestionar Roles cachés", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, employees: false });
      expect(screen.queryByText("Empleados")).not.toBeInTheDocument();
      expect(screen.queryByText("Gestionar Roles")).not.toBeInTheDocument();
    });

    it("Schedules désactivé → Asistencia caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, schedules: false });
      expect(screen.queryByText("Asistencia")).not.toBeInTheDocument();
    });

    it("Payroll désactivé → Períodos et Recibos cachés", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, payroll: false });
      expect(screen.queryByText("Períodos")).not.toBeInTheDocument();
      expect(screen.queryByText("Recibos")).not.toBeInTheDocument();
    });

    it("Expenses désactivé → Gastos caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, expenses: false });
      expect(screen.queryByText("Gastos")).not.toBeInTheDocument();
    });

    it("Contacts désactivé → Contactos caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, contacts: false });
      expect(screen.queryByText("Contactos")).not.toBeInTheDocument();
    });

    it("Taxes désactivé → Impuestos caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, taxes: false });
      expect(screen.queryByText("Impuestos")).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. Conditions mixtes : feature activée mais permission manquante
  //    et permission présente mais feature désactivée
  // ══════════════════════════════════════════════════════════════════
  describe("Feature active + permission manquante → caché", () => {
    it("Caja : feature POS on, mais pas pos.create → caché", async () => {
      await renderDashboard(["pos.view"], { ...ALL_FEATURES, pos: true });
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
    });

    it("Inventario : feature inventory on, mais pas inventory.view → caché", async () => {
      await renderDashboard(["pos.create"], { ...ALL_FEATURES, inventory: true });
      expect(screen.queryByText("Inventario")).not.toBeInTheDocument();
    });

    it("Empleados : feature employees on, mais pas employees.view → caché", async () => {
      await renderDashboard(["pos.create"], { ...ALL_FEATURES, employees: true });
      expect(screen.queryByText("Empleados")).not.toBeInTheDocument();
    });

    it("Reportes : feature reports on, mais pas reports.view → caché", async () => {
      await renderDashboard(["pos.create"], { ...ALL_FEATURES, reports: true });
      expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
    });

    it("Gastos : feature expenses on, mais pas expenses.create ni view_all → caché", async () => {
      await renderDashboard(["expenses.view_own"], { ...ALL_FEATURES, expenses: true });
      expect(screen.queryByText("Gastos")).not.toBeInTheDocument();
    });
  });

  describe("Permission présente + feature désactivée → caché", () => {
    it("Caja : pos.create présent, mais feature POS off → caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, pos: false });
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
    });

    it("Empleados : employees.view présent, mais feature employees off → caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, employees: false });
      expect(screen.queryByText("Empleados")).not.toBeInTheDocument();
    });

    it("Períodos : payroll.view présent, mais feature payroll off → caché", async () => {
      await renderDashboard(ADMIN_PERMISSIONS, { ...ALL_FEATURES, payroll: false });
      expect(screen.queryByText("Períodos")).not.toBeInTheDocument();
    });
  });

  describe("Modules sans feature flag — visibles si permission seule suffit", () => {
    it("Clientes Fieles : visible avec seulement loyalty.view (pas de feature flag)", async () => {
      await renderDashboard(["loyalty.view"], { ...ALL_FEATURES, loyalty: false });
      // Pas de feature flag → visible si permission présente
      expect(screen.getByText("Clientes Fieles")).toBeInTheDocument();
    });

    it("Configuración : visible avec seulement settings.view (pas de feature flag)", async () => {
      await renderDashboard(["settings.view"], { ...ALL_FEATURES, settings: false });
      expect(screen.getByText("Configuración")).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 8. Sections (groupes) de modules
  // ══════════════════════════════════════════════════════════════════
  describe("Sections de modules", () => {
    it("Admin voit les 4 sections", async () => {
      await renderDashboard(ADMIN_PERMISSIONS);
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.getByText("Finanzas & Reportes")).toBeInTheDocument();
      expect(screen.getByText("Nómina & RRHH")).toBeInTheDocument();
      expect(screen.getByText("Administración")).toBeInTheDocument();
    });

    it("Cashier voit seulement 'Ventas' et 'Nómina & RRHH'", async () => {
      await renderDashboard(CASHIER_PERMISSIONS);
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.getByText("Nómina & RRHH")).toBeInTheDocument();
      expect(screen.queryByText("Finanzas & Reportes")).not.toBeInTheDocument();
      expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    });

    it("Manager ne voit pas la section 'Administración'", async () => {
      await renderDashboard(MANAGER_PERMISSIONS);
      expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    });

    it("Manager voit 'Ventas', 'Finanzas & Reportes' et 'Nómina & RRHH'", async () => {
      await renderDashboard(MANAGER_PERMISSIONS);
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.getByText("Finanzas & Reportes")).toBeInTheDocument();
      expect(screen.getByText("Nómina & RRHH")).toBeInTheDocument();
    });

    it("Une section sans aucun module visible n'est pas affichée", async () => {
      // Seulement pos.create → section Ventas visible, autres absentes
      await renderDashboard(["pos.create"]);
      expect(screen.getByText("Ventas")).toBeInTheDocument();
      expect(screen.queryByText("Finanzas & Reportes")).not.toBeInTheDocument();
      expect(screen.queryByText("Nómina & RRHH")).not.toBeInTheDocument();
      expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 9. Permissions personnalisées (rôle custom assigné par l'admin)
  // ══════════════════════════════════════════════════════════════════
  describe("Permissions personnalisées", () => {
    it("Employé avec seulement expenses.create voit uniquement Gastos", async () => {
      await renderDashboard(["expenses.create"]);
      expect(screen.getByText("Gastos")).toBeInTheDocument();
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
      expect(screen.queryByText("Empleados")).not.toBeInTheDocument();
    });

    it("Employé avec seulement loyalty.view voit uniquement Clientes Fieles", async () => {
      await renderDashboard(["loyalty.view"]);
      expect(screen.getByText("Clientes Fieles")).toBeInTheDocument();
      expect(screen.queryByText("Caja")).not.toBeInTheDocument();
    });

    it("Employé avec expenses.view_all voit Gastos (permission alternative)", async () => {
      await renderDashboard(["expenses.view_all"]);
      expect(screen.getByText("Gastos")).toBeInTheDocument();
    });

    it("Employé avec schedules.checkin seul voit Asistencia", async () => {
      await renderDashboard(["schedules.checkin"]);
      expect(screen.getByText("Asistencia")).toBeInTheDocument();
    });

    it("Employé avec schedules.view seul voit Asistencia", async () => {
      await renderDashboard(["schedules.view"]);
      expect(screen.getByText("Asistencia")).toBeInTheDocument();
    });

    it("Impuestos accessible avec settings.manage_modules (sans manage_roles)", async () => {
      await renderDashboard(["settings.manage_modules"]);
      expect(screen.getByText("Impuestos")).toBeInTheDocument();
    });

    it("Impuestos accessible avec settings.manage_roles (sans manage_modules)", async () => {
      await renderDashboard(["settings.manage_roles"]);
      expect(screen.getByText("Impuestos")).toBeInTheDocument();
    });

    it("Cierre de Caja accessible avec seulement pos.cierre_review", async () => {
      await renderDashboard(["pos.cierre_review"]);
      expect(screen.getByText("Cierre de Caja")).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 10. Liens des modules (hrefs corrects)
  // ══════════════════════════════════════════════════════════════════
  describe("Liens des modules", () => {
    // Helper: récupère le lien parent du titre de la carte
    const linkOf = (title: string) => screen.getByText(title).closest("a");

    beforeEach(() => renderDashboard(ADMIN_PERMISSIONS));

    it("Caja → /dashboard/pos", () => {
      expect(linkOf("Caja")).toHaveAttribute("href", "/dashboard/pos");
    });

    it("Transacciones → /dashboard/transactions", () => {
      expect(linkOf("Transacciones")).toHaveAttribute("href", "/dashboard/transactions");
    });

    it("Cierre de Caja → /dashboard/pos/cierre", () => {
      expect(linkOf("Cierre de Caja")).toHaveAttribute("href", "/dashboard/pos/cierre");
    });

    it("Inventario → /dashboard/inventory", () => {
      expect(linkOf("Inventario")).toHaveAttribute("href", "/dashboard/inventory");
    });

    it("Ganancias → /dashboard/profits", () => {
      expect(linkOf("Ganancias")).toHaveAttribute("href", "/dashboard/profits");
    });

    it("Reportes → /dashboard/reports", () => {
      expect(linkOf("Reportes")).toHaveAttribute("href", "/dashboard/reports");
    });

    it("Empleados → /dashboard/employees", () => {
      expect(linkOf("Empleados")).toHaveAttribute("href", "/dashboard/employees");
    });

    it("Asistencia → /dashboard/schedules", () => {
      expect(linkOf("Asistencia")).toHaveAttribute("href", "/dashboard/schedules");
    });

    it("Períodos → /dashboard/payroll/periods", () => {
      expect(linkOf("Períodos")).toHaveAttribute("href", "/dashboard/payroll/periods");
    });

    it("Gestionar Roles → /dashboard/admin/roles", () => {
      expect(linkOf("Gestionar Roles")).toHaveAttribute("href", "/dashboard/admin/roles");
    });

    it("Configuración → /dashboard/settings", () => {
      expect(linkOf("Configuración")).toHaveAttribute("href", "/dashboard/settings");
    });

    it("Impuestos → /dashboard/settings/taxes", () => {
      expect(linkOf("Impuestos")).toHaveAttribute("href", "/dashboard/settings/taxes");
    });
  });
});
