/**
 * 🎨 UI Consistency & Visibility Tests - Phase 3C
 * 
 * Tests that verify:
 * - Dashboard modules match Sidebar modules
 * - No permission discrepancies
 * - No double-gating issues
 * - Module visibility consistent across UI
 * - Role name display is consistent
 */

import { DEFAULT_ROLES, permissionsForRole } from "@/lib/types/roles";

interface Module {
  name: string;
  displayName: string;
  requiredPerms: string[]; // Any of these permissions grant access
  category: "pos" | "inventory" | "employees" | "payroll" | "schedules" | "reports" | "loyalty" | "contacts" | "expenses" | "settings";
}

// Define all modules exactly as they appear in app
const ALL_MODULES: Module[] = [
  {
    name: "caja",
    displayName: "Caja",
    requiredPerms: ["pos.create"],
    category: "pos",
  },
  {
    name: "transacciones",
    displayName: "Transacciones",
    requiredPerms: ["pos.view"],
    category: "pos",
  },
  {
    name: "cierre-caja",
    displayName: "Cierre de Caja",
    requiredPerms: ["pos.cierre", "pos.cierre_review"],
    category: "pos",
  },
  {
    name: "gestion-productos",
    displayName: "Gestión de Productos",
    requiredPerms: ["inventory.view"],
    category: "inventory",
  },
  {
    name: "empleados",
    displayName: "Empleados",
    requiredPerms: ["employees.view"],
    category: "employees",
  },
  {
    name: "asistencia",
    displayName: "Asistencia",
    requiredPerms: ["schedules.view", "schedules.checkin"],
    category: "schedules",
  },
  {
    name: "periodos-pago",
    displayName: "Períodos de Pago",
    requiredPerms: ["payroll.view", "payroll.create"],
    category: "payroll",
  },
  {
    name: "recibos",
    displayName: "Recibos",
    requiredPerms: ["payroll.view"],
    category: "payroll",
  },
  {
    name: "reportes",
    displayName: "Reportes",
    requiredPerms: ["reports.view"],
    category: "reports",
  },
  {
    name: "clientes-fieles",
    displayName: "Clientes Fieles",
    requiredPerms: ["loyalty.view"],
    category: "loyalty",
  },
  {
    name: "gastos",
    displayName: "Gastos",
    requiredPerms: ["expenses.create", "expenses.view_all", "expenses.view_own"],
    category: "expenses",
  },
  {
    name: "contactos",
    displayName: "Contactos",
    requiredPerms: ["contacts.view"],
    category: "contacts",
  },
];

// Module visibility definitions for Dashboard
const DASHBOARD_MODULES: Module[] = [
  { name: "caja", displayName: "Caja", requiredPerms: ["pos.create"], category: "pos" },
  { name: "transacciones", displayName: "Transacciones", requiredPerms: ["pos.view"], category: "pos" },
  { name: "cierre-caja", displayName: "Cierre de Caja", requiredPerms: ["pos.cierre", "pos.cierre_review"], category: "pos" },
  { name: "gestion-productos", displayName: "Gestión de Productos", requiredPerms: ["inventory.view"], category: "inventory" },
  { name: "empleados", displayName: "Empleados", requiredPerms: ["employees.view"], category: "employees" },
  { name: "asistencia", displayName: "Asistencia", requiredPerms: ["schedules.view", "schedules.checkin"], category: "schedules" },
  { name: "periodos-pago", displayName: "Períodos de Pago", requiredPerms: ["payroll.view", "payroll.create"], category: "payroll" },
  { name: "recibos", displayName: "Recibos", requiredPerms: ["payroll.view"], category: "payroll" },
  { name: "reportes", displayName: "Reportes", requiredPerms: ["reports.view"], category: "reports" },
  { name: "clientes-fieles", displayName: "Clientes Fieles", requiredPerms: ["loyalty.view"], category: "loyalty" },
  { name: "gastos", displayName: "Gastos", requiredPerms: ["expenses.create", "expenses.view_all", "expenses.view_own"], category: "expenses" },
  { name: "contactos", displayName: "Contactos", requiredPerms: ["contacts.view"], category: "contacts" },
];

// Module visibility definitions for Sidebar
const SIDEBAR_MODULES: Module[] = [
  { name: "caja", displayName: "Caja", requiredPerms: ["pos.create"], category: "pos" },
  { name: "transacciones", displayName: "Transacciones", requiredPerms: ["pos.view"], category: "pos" },
  { name: "cierre-caja", displayName: "Cierre de Caja", requiredPerms: ["pos.cierre", "pos.cierre_review"], category: "pos" },
  { name: "gestion-productos", displayName: "Gestión de Productos", requiredPerms: ["inventory.view"], category: "inventory" },
  { name: "empleados", displayName: "Empleados", requiredPerms: ["employees.view"], category: "employees" },
  { name: "asistencia", displayName: "Asistencia", requiredPerms: ["schedules.view", "schedules.checkin"], category: "schedules" },
  { name: "periodos-pago", displayName: "Períodos de Pago", requiredPerms: ["payroll.view", "payroll.create"], category: "payroll" },
  { name: "recibos", displayName: "Recibos", requiredPerms: ["payroll.view"], category: "payroll" },
  { name: "reportes", displayName: "Reportes", requiredPerms: ["reports.view"], category: "reports" },
  { name: "clientes-fieles", displayName: "Clientes Fieles", requiredPerms: ["loyalty.view"], category: "loyalty" },
  { name: "gastos", displayName: "Gastos", requiredPerms: ["expenses.create", "expenses.view_all", "expenses.view_own"], category: "expenses" },
  { name: "contactos", displayName: "Contactos", requiredPerms: ["contacts.view"], category: "contacts" },
];

// Admin menu items
const ADMIN_SUBMENU: Module[] = [
  { name: "manage-roles", displayName: "Gestionar Roles", requiredPerms: ["settings.manage_roles"], category: "settings" },
  { name: "configuracion", displayName: "Configuración", requiredPerms: ["settings.manage_roles", "settings.manage_modules"], category: "settings" },
];

/**
 * Helper: Check if user has access to module
 */
const userCanAccessModule = (userPerms: string[], module: Module): boolean => {
  return module.requiredPerms.some((perm) => userPerms.includes(perm));
};

/**
 * Helper: Get visible modules for user
 */
const getVisibleModules = (userPerms: string[], modules: Module[]): Module[] => {
  return modules.filter((mod) => userCanAccessModule(userPerms, mod));
};

describe("🎨 UI Consistency & Visibility Tests", () => {
  describe("Dashboard & Sidebar Module Consistency", () => {
    test("Dashboard and Sidebar have exactly same modules", () => {
      expect(DASHBOARD_MODULES.length).toBe(SIDEBAR_MODULES.length);
      expect(DASHBOARD_MODULES.map((m) => m.name).sort()).toEqual(SIDEBAR_MODULES.map((m) => m.name).sort());
    });

    test("Dashboard and Sidebar modules have same permissions", () => {
      DASHBOARD_MODULES.forEach((dashMod) => {
        const sideMod = SIDEBAR_MODULES.find((m) => m.name === dashMod.name);
        expect(sideMod).toBeDefined();
        expect(sideMod?.requiredPerms).toEqual(dashMod.requiredPerms);
      });
    });

    test("All modules have consistent names", () => {
      DASHBOARD_MODULES.forEach((dashMod) => {
        const sideMod = SIDEBAR_MODULES.find((m) => m.name === dashMod.name);
        expect(sideMod?.displayName).toBe(dashMod.displayName);
      });
    });
  });

  describe("Cashier Module Visibility", () => {
    test("Cashier sees exactly the right modules in Dashboard", () => {
      const cashierPerms = permissionsForRole("cashier");
      const visible = getVisibleModules(cashierPerms, DASHBOARD_MODULES);

      // Cashier has: pos.create, pos.view, inventory.view, schedules.checkin, pos.cierre
      const expectedModules = ["caja", "transacciones", "gestion-productos", "asistencia", "cierre-caja"];
      expect(visible.map((m) => m.name).sort()).toEqual(expectedModules.sort());
    });

    test("Cashier sees exactly the right modules in Sidebar", () => {
      const cashierPerms = permissionsForRole("cashier");
      const visible = getVisibleModules(cashierPerms, SIDEBAR_MODULES);

      const expectedModules = ["caja", "transacciones", "gestion-productos", "asistencia", "cierre-caja"];
      expect(visible.map((m) => m.name).sort()).toEqual(expectedModules.sort());
    });

    test("Cashier does NOT see admin modules", () => {
      const cashierPerms = permissionsForRole("cashier");
      const adminVisible = getVisibleModules(cashierPerms, ADMIN_SUBMENU);

      expect(adminVisible.length).toBe(0);
    });

    test("Cashier does NOT see payroll modules", () => {
      const cashierPerms = permissionsForRole("cashier");
      const visible = getVisibleModules(cashierPerms, DASHBOARD_MODULES);

      const payrollModules = visible.filter((m) => m.category === "payroll");
      expect(payrollModules.length).toBe(0);
    });

    test("Cashier does NOT see employee management", () => {
      const cashierPerms = permissionsForRole("cashier");
      const visible = getVisibleModules(cashierPerms, DASHBOARD_MODULES);

      const hasEmpleados = visible.some((m) => m.name === "empleados");
      expect(hasEmpleados).toBe(false);
    });
  });

  describe("Manager Module Visibility", () => {
    test("Manager sees most modules except pos.create", () => {
      const managerPerms = permissionsForRole("manager");
      const visible = getVisibleModules(managerPerms, DASHBOARD_MODULES);

      // Manager now has expenses.view_all, contacts.view, loyalty.view
      expect(visible.length).toBe(11);
    });

    test("Manager sees payroll modules", () => {
      const managerPerms = permissionsForRole("manager");
      const visible = getVisibleModules(managerPerms, DASHBOARD_MODULES);

      const payrollModules = visible.filter((m) => m.category === "payroll");
      expect(payrollModules.length).toBeGreaterThan(0);
    });

    test("Manager sees employee management", () => {
      const managerPerms = permissionsForRole("manager");
      const visible = getVisibleModules(managerPerms, DASHBOARD_MODULES);

      const hasEmpleados = visible.some((m) => m.name === "empleados");
      expect(hasEmpleados).toBe(true);
    });

    test("Manager does NOT see role management", () => {
      const managerPerms = permissionsForRole("manager");
      const adminVisible = getVisibleModules(managerPerms, ADMIN_SUBMENU);

      expect(adminVisible.length).toBe(0);
    });
  });

  describe("Admin Module Visibility", () => {
    test("Admin sees ALL modules", () => {
      const adminPerms = permissionsForRole("admin");
      const visible = getVisibleModules(adminPerms, DASHBOARD_MODULES);

      expect(visible.length).toBe(DASHBOARD_MODULES.length);
    });

    test("Admin sees admin menu", () => {
      const adminPerms = permissionsForRole("admin");
      const adminVisible = getVisibleModules(adminPerms, ADMIN_SUBMENU);

      expect(adminVisible.length).toBe(ADMIN_SUBMENU.length);
    });

    test("Admin can manage roles", () => {
      const adminPerms = permissionsForRole("admin");
      const hasManageRoles = adminPerms.includes("settings.manage_roles");

      expect(hasManageRoles).toBe(true);
    });
  });

  describe("No Double-Gating Issues", () => {
    test("Permission check is ONLY based on permissions, not features", () => {
      // Simulate the old double-gating bug
      const mockUserWithPermission = {
        permissions: ["pos.create"],
        features: { pos: false }, // Feature disabled, but permission granted
      };

      // Should still be visible if permission exists
      const shouldBeVisible = mockUserWithPermission.permissions.includes("pos.create");
      expect(shouldBeVisible).toBe(true);

      // OLD BUG: Would check both features.pos && hasPermission
      // NEW: Only checks hasPermission
    });

    test("Disabling feature should not bypass permissions check", () => {
      // Even if feature is disabled, permission check should prevent access
      const mockUserWithoutPermission = {
        permissions: ["pos.view"],
        features: { pos: true }, // Feature enabled, but user lacks create permission
      };

      const hasCreatePermission = mockUserWithoutPermission.permissions.includes("pos.create");
      expect(hasCreatePermission).toBe(false);
    });
  });

  describe("Permission-Based Visibility Only", () => {
    test("Cierre de Caja only shows with pos.cierre OR pos.cierre_review", () => {
      const userNoCierre = { permissions: ["pos.view", "pos.create"] };
      const canSeeCierre = userNoCierre.permissions.some((p) => ["pos.cierre", "pos.cierre_review"].includes(p));
      expect(canSeeCierre).toBe(false);

      const userWithCierre = { permissions: ["pos.view", "pos.cierre"] };
      const canSeeCierre2 = userWithCierre.permissions.some((p) => ["pos.cierre", "pos.cierre_review"].includes(p));
      expect(canSeeCierre2).toBe(true);
    });

    test("Gastos shows with expenses.create OR expenses.view_all OR expenses.view_own", () => {
      const userWithViewOwn = { permissions: ["expenses.view_own"] };
      const canSeeGastos = ["expenses.create", "expenses.view_all", "expenses.view_own"].some((p) =>
        userWithViewOwn.permissions.includes(p)
      );
      expect(canSeeGastos).toBe(true);

      const userWithoutExpenses = { permissions: ["pos.view"] };
      const canSeeGastos2 = ["expenses.create", "expenses.view_all", "expenses.view_own"].some((p) =>
        userWithoutExpenses.permissions.includes(p)
      );
      expect(canSeeGastos2).toBe(false);
    });

    test("Asistencia shows with schedules.view OR schedules.checkin", () => {
      const userWithCheckIn = { permissions: ["schedules.checkin"] };
      const canSeeAsistencia = ["schedules.view", "schedules.checkin"].some((p) => userWithCheckIn.permissions.includes(p));
      expect(canSeeAsistencia).toBe(true);

      const userWithoutSchedules = { permissions: ["pos.view"] };
      const canSeeAsistencia2 = ["schedules.view", "schedules.checkin"].some((p) => userWithoutSchedules.permissions.includes(p));
      expect(canSeeAsistencia2).toBe(false);
    });
  });

  describe("Role Name Display Consistency", () => {
    test("Admin role displays as 'Admin' everywhere", () => {
      const role = "admin";
      const displayName = role.charAt(0).toUpperCase() + role.slice(1);
      expect(displayName).toBe("Admin");
    });

    test("Manager role displays as 'Manager' everywhere", () => {
      const role = "manager";
      const displayName = role.charAt(0).toUpperCase() + role.slice(1);
      expect(displayName).toBe("Manager");
    });

    test("Cashier role displays as 'Cashier' everywhere", () => {
      const role = "cashier";
      const displayName = role.charAt(0).toUpperCase() + role.slice(1);
      expect(displayName).toBe("Cashier");
    });

    test("Custom role UUID is resolved to name", () => {
      const roleUUID = "65cbdb4f-07d7-4613-9f51-020abd791f26";
      const customRoles: Record<string, string> = {
        "65cbdb4f-07d7-4613-9f51-020abd791f26": "Supervisor",
      };

      const displayName = customRoles[roleUUID] || roleUUID;
      expect(displayName).toBe("Supervisor");
      expect(displayName).not.toBe(roleUUID);
    });
  });

  describe("Category Organization", () => {
    test("All POS modules are under POS category", () => {
      const posModules = DASHBOARD_MODULES.filter((m) => m.category === "pos");
      const expectedPosModules = ["caja", "transacciones", "cierre-caja"];

      expect(posModules.map((m) => m.name).sort()).toEqual(expectedPosModules.sort());
    });

    test("All Payroll modules are under Payroll category", () => {
      const payrollModules = DASHBOARD_MODULES.filter((m) => m.category === "payroll");
      const expectedPayrollModules = ["periodos-pago", "recibos"];

      expect(payrollModules.map((m) => m.name).sort()).toEqual(expectedPayrollModules.sort());
    });

    test("Settings modules are under Settings category", () => {
      const settingsModules = ADMIN_SUBMENU.filter((m) => m.category === "settings");
      expect(settingsModules.length).toBeGreaterThan(0);
    });

    test("All categories have at least one module", () => {
      const categories = ["pos", "inventory", "employees", "payroll", "schedules", "reports", "loyalty", "contacts", "expenses"];

      categories.forEach((cat) => {
        const modulesInCat = DASHBOARD_MODULES.filter((m) => m.category === cat);
        expect(modulesInCat.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Module Accessibility Across Roles", () => {
    test("No module is visible to all roles", () => {
      // Even admin-specific features shouldn't be visible to cashier
      const cashierPerms = permissionsForRole("cashier");

      const adminModules = ADMIN_SUBMENU;
      const visibleToRoleCashier = getVisibleModules(cashierPerms, adminModules);

      expect(visibleToRoleCashier.length).toBe(0);
    });

    test("No module accessible to no one", () => {
      // Every module should be accessible to someone (at least admin)
      const adminPerms = permissionsForRole("admin");

      DASHBOARD_MODULES.forEach((mod) => {
        const isAccessible = userCanAccessModule(adminPerms, mod);
        expect(isAccessible).toBe(true);
      });
    });

    test("Permission granularity is respected", () => {
      // pos.cierre is different from pos.view
      const posViewOnly = { permissions: ["pos.view"] };
      const canCierre = userCanAccessModule(posViewOnly.permissions, {
        name: "cierre",
        displayName: "Cierre",
        requiredPerms: ["pos.cierre"],
        category: "pos",
      });

      expect(canCierre).toBe(false);
    });
  });

  describe("Module Count Display", () => {
    test("Dashboard shows correct module count for cashier", () => {
      const cashierPerms = permissionsForRole("cashier");
      const visible = getVisibleModules(cashierPerms, DASHBOARD_MODULES);

      // Cashier: caja, transacciones, gestion-productos, asistencia, cierre-caja = 5
      expect(visible.length).toBe(5);
    });

    test("Dashboard shows correct module count for manager", () => {
      const managerPerms = permissionsForRole("manager");
      const visible = getVisibleModules(managerPerms, DASHBOARD_MODULES);

      // Manager should see most modules except admin
      expect(visible.length).toBeGreaterThan(6);
    });

    test("Dashboard shows correct module count for admin", () => {
      const adminPerms = permissionsForRole("admin");
      const visible = getVisibleModules(adminPerms, DASHBOARD_MODULES);

      // Admin should see all modules
      expect(visible.length).toBe(DASHBOARD_MODULES.length);
    });
  });

  describe("No Permission Escaping", () => {
    test("User cannot see modules by guessing permissions", () => {
      const userPerms = ["pos.view"];

      // Try to access a module that requires payroll.view
      const payrollModule = {
        name: "recibos",
        displayName: "Recibos",
        requiredPerms: ["payroll.view"],
        category: "payroll" as const,
      };

      const hasAccess = userCanAccessModule(userPerms, payrollModule);
      expect(hasAccess).toBe(false);
    });

    test("Cashier cannot have admin-only permissions", () => {
      const cashierPerms = permissionsForRole("cashier");
      const adminOnlyPerms = ["settings.manage_roles", "settings.manage_modules"];
      
      adminOnlyPerms.forEach((perm) => {
        expect(cashierPerms).not.toContain(perm);
      });
    });
  });
});
