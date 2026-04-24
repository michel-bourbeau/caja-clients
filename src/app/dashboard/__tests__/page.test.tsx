import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../page";
import { useAuth } from "@/context/AuthContext";
import { useTenantFeatures } from "@/lib/utils/tenantFeatures";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";

jest.mock("@/context/AuthContext");
jest.mock("@/lib/utils/tenantFeatures");
jest.mock("@/lib/utils/tenant");
jest.mock("@/lib/utils/useCurrency");
jest.mock("@/components/ui", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTenantFeatures = useTenantFeatures as jest.MockedFunction<typeof useTenantFeatures>;
const mockUseTenantId = useTenantId as jest.MockedFunction<typeof useTenantId>;
const mockUseCurrency = useCurrency as jest.MockedFunction<typeof useCurrency>;

describe("DashboardPage - Module Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTenantId.mockReturnValue("tenant-123");
    mockUseCurrency.mockReturnValue({
      fmt: (value: number) => `$${value}`,
      currency: "USD",
      symbol: "$",
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;
  });

  describe("Module Links - Correct URLs", () => {
    it("should render Caja with correct href", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: ["pos.create"] },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /^Caja/i });
        expect(link).toHaveAttribute("href", "/dashboard/pos");
      });
    });

    it("should render Períodos with correct href", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: ["payroll.view"] },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: true,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Períodos/i });
        expect(link).toHaveAttribute("href", "/dashboard/payroll/periods");
      });
    });

    it("should render Recibos with correct href", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: ["payroll.view"] },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: true,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Recibos/i });
        expect(link).toHaveAttribute("href", "/dashboard/payroll/receipts");
      });
    });

    it("should render all module links", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "Admin",
          roleId: "admin",
          permissions: [
            "pos.create",
            "pos.view",
            "pos.cierre",
            "inventory.view",
            "employees.view",
            "schedules.view",
            "payroll.view",
            "reports.view",
            "settings.manage_roles",
            "settings.view",
          ],
        },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: true,
          employees: true,
          schedules: true,
          payroll: true,
          reports: true,
          loyalty: true,
          settings: true,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      const expectedHrefs = [
        "/dashboard/pos",
        "/dashboard/transactions",
        "/dashboard/pos/cierre",
        "/dashboard/inventory",
        "/dashboard/employees",
        "/dashboard/schedules",
        "/dashboard/payroll/periods",
        "/dashboard/payroll/receipts",
        "/dashboard/reports",
        "/dashboard/loyalty",
        "/dashboard/admin/roles",
        "/dashboard/settings",
      ];

      await waitFor(() => {
        const allLinks = screen.getAllByRole("link");
        expectedHrefs.forEach(href => {
          const found = allLinks.some(l => l.getAttribute("href") === href);
          expect(found).toBe(true);
        });
      });
    });
  });

  describe("Module Visibility - Permissions", () => {
    it("should not show Caja without pos.create permission", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: [] },
        hasPermission: jest.fn(() => false),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const posLinks = links.filter(l => l.getAttribute("href") === "/dashboard/pos");
        expect(posLinks).toHaveLength(0);
      });
    });

    it("should show Gestionar Roles with settings.manage_roles permission", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["settings.manage_roles"],
        },
        hasPermission: jest.fn((perm) => perm === "settings.manage_roles"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: true,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Gestionar Roles/i });
        expect(link).toHaveAttribute("href", "/dashboard/admin/roles");
      });
    });

    it("should not show Gestionar Roles without settings.manage_roles permission", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: [] },
        hasPermission: jest.fn(() => false),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const rolesLinks = links.filter(l => l.getAttribute("href") === "/dashboard/admin/roles");
        expect(rolesLinks).toHaveLength(0);
      });
    });
  });

  describe("Module Visibility - Tenant Features", () => {
    it("should not show POS modules when pos feature is disabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["pos.create", "pos.view", "pos.cierre"],
        },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const posLinks = links.filter(l => {
          const href = l.getAttribute("href");
          return href === "/dashboard/pos" || href === "/dashboard/transactions" || href === "/dashboard/pos/cierre";
        });
        expect(posLinks).toHaveLength(0);
      });
    });

    it("should show Inventario when inventory feature is enabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["inventory.view"],
        },
        hasPermission: jest.fn((perm) => perm === "inventory.view"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: true,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Inventario/i });
        expect(link).toHaveAttribute("href", "/dashboard/inventory");
      });
    });

    it("should not show Inventario when inventory feature is disabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["inventory.view"],
        },
        hasPermission: jest.fn((perm) => perm === "inventory.view"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const inventoryLinks = links.filter(l => l.getAttribute("href") === "/dashboard/inventory");
        expect(inventoryLinks).toHaveLength(0);
      });
    });

    it("should show payroll modules when payroll feature is enabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["payroll.view"],
        },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: true,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const periodos = screen.getByRole("link", { name: /Períodos/i });
        expect(periodos).toHaveAttribute("href", "/dashboard/payroll/periods");

        const recibos = screen.getByRole("link", { name: /Recibos/i });
        expect(recibos).toHaveAttribute("href", "/dashboard/payroll/receipts");
      });
    });

    it("should not show payroll modules when payroll feature is disabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["payroll.view"],
        },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const payrollLinks = links.filter(l => {
          const href = l.getAttribute("href");
          return href === "/dashboard/payroll/periods" || href === "/dashboard/payroll/receipts";
        });
        expect(payrollLinks).toHaveLength(0);
      });
    });

    it("should show Clientes Fieles when loyalty feature is enabled", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: [] },
        hasPermission: jest.fn(() => false),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: true,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Clientes Fieles/i });
        expect(link).toHaveAttribute("href", "/dashboard/loyalty");
      });
    });
  });

  describe("Combined Permissions and Features", () => {
    it("should show module only when both feature and permission are enabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["employees.view"],
        },
        hasPermission: jest.fn((perm) => perm === "employees.view"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: true,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Empleados/i });
        expect(link).toHaveAttribute("href", "/dashboard/employees");
      });
    });

    it("should hide module when feature is enabled but permission is denied", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: [] },
        hasPermission: jest.fn(() => false),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: true,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const employeesLinks = links.filter(l => l.getAttribute("href") === "/dashboard/employees");
        expect(employeesLinks).toHaveLength(0);
      });
    });

    it("should hide module when permission is granted but feature is disabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["employees.view"],
        },
        hasPermission: jest.fn((perm) => perm === "employees.view"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.queryAllByRole("link");
        const employeesLinks = links.filter(l => l.getAttribute("href") === "/dashboard/employees");
        expect(employeesLinks).toHaveLength(0);
      });
    });

    it("should show multiple modules with all features and permissions enabled", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: [
            "pos.create",
            "pos.view",
            "inventory.view",
            "employees.view",
          ],
        },
        hasPermission: jest.fn(() => true),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: true,
          employees: true,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const caja = screen.getByRole("link", { name: /^Caja/i });
        expect(caja).toHaveAttribute("href", "/dashboard/pos");

        const inventario = screen.getByRole("link", { name: /Inventario/i });
        expect(inventario).toHaveAttribute("href", "/dashboard/inventory");

        const empleados = screen.getByRole("link", { name: /Empleados/i });
        expect(empleados).toHaveAttribute("href", "/dashboard/employees");
      });
    });
  });

  describe("Permission Logic - Complex Cases", () => {
    it("should show Cierre de Caja with pos.cierre permission", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["pos.cierre"],
        },
        hasPermission: jest.fn((perm) => perm === "pos.cierre"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Cierre de Caja/i });
        expect(link).toHaveAttribute("href", "/dashboard/pos/cierre");
      });
    });

    it("should show Cierre de Caja with pos.cierre_review permission", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["pos.cierre_review"],
        },
        hasPermission: jest.fn((perm) => perm === "pos.cierre_review"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: true,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Cierre de Caja/i });
        expect(link).toHaveAttribute("href", "/dashboard/pos/cierre");
      });
    });

    it("should show Asistencia with schedules.view permission", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["schedules.view"],
        },
        hasPermission: jest.fn((perm) => perm === "schedules.view"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: true,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Asistencia/i });
        expect(link).toHaveAttribute("href", "/dashboard/schedules");
      });
    });

    it("should show Asistencia with schedules.checkin permission", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          firstName: "John",
          roleId: "admin",
          permissions: ["schedules.checkin"],
        },
        hasPermission: jest.fn((perm) => perm === "schedules.checkin"),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: true,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Asistencia/i });
        expect(link).toHaveAttribute("href", "/dashboard/schedules");
      });
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no modules are accessible", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "user-1", firstName: "John", roleId: "admin", permissions: [] },
        hasPermission: jest.fn(() => false),
        logout: jest.fn(),
      } as any);

      mockUseTenantFeatures.mockReturnValue({
        features: {
          pos: false,
          inventory: false,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          settings: false,
        },
        loading: false, error: null,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Sin acceso a módulos")).toBeInTheDocument();
      });
    });
  });
});
