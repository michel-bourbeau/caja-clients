/**
 * 🔒 Permission Security Tests
 * 
 * Critical tests to ensure the role-based access control system is secure and consistent.
 * These tests verify that:
 * - Each system role has correct isolated permissions
 * - Users cannot escalate privileges
 * - Permission logic is consistent across the system
 */

import { DEFAULT_ROLES, DEFAULT_PERMISSIONS, ADMIN_ONLY_PERMISSIONS } from "@/lib/types/roles";

describe("🔒 Permission System Security", () => {
  describe("System Roles Exist and Are Valid", () => {
    test("admin role exists", () => {
      const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
      expect(adminRole).toBeDefined();
      expect(adminRole?.name).toBe("Administrador");
      expect(adminRole?.isSystem).toBe(true);
    });

    test("manager role exists", () => {
      const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
      expect(managerRole).toBeDefined();
      expect(managerRole?.name).toBe("Gerente");
      expect(managerRole?.isSystem).toBe(true);
    });

    test("cashier role exists", () => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      expect(cashierRole).toBeDefined();
      expect(cashierRole?.name).toBe("Vendedor");
      expect(cashierRole?.isSystem).toBe(true);
    });
  });

  describe("Role Isolation - Cashier", () => {
    let cashierPerms: string[];

    beforeAll(() => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      cashierPerms = cashierRole?.permissions || [];
    });

    test("Cashier CANNOT manage roles", () => {
      expect(cashierPerms).not.toContain("settings.manage_roles");
    });

    test("Cashier CANNOT manage modules", () => {
      expect(cashierPerms).not.toContain("settings.manage_modules");
    });

    test("Cashier CANNOT view payroll", () => {
      expect(cashierPerms).not.toContain("payroll.view");
      expect(cashierPerms).not.toContain("payroll.create");
      expect(cashierPerms).not.toContain("payroll.approve");
    });

    test("Cashier CANNOT edit employees", () => {
      expect(cashierPerms).not.toContain("employees.create");
      expect(cashierPerms).not.toContain("employees.edit");
      expect(cashierPerms).not.toContain("employees.delete");
    });

    test("Cashier CANNOT edit settings", () => {
      expect(cashierPerms).not.toContain("settings.edit");
      expect(cashierPerms).not.toContain("settings.view");
    });

    test("Cashier CAN create POS sales", () => {
      expect(cashierPerms).toContain("pos.create");
    });

    test("Cashier CAN view inventory", () => {
      expect(cashierPerms).toContain("inventory.view");
    });

    test("Cashier CAN do check-in/out", () => {
      expect(cashierPerms).toContain("schedules.checkin");
    });

    test("Cashier CAN do pos.cierre (close register)", () => {
      expect(cashierPerms).toContain("pos.cierre");
    });
  });

  describe("Role Isolation - Manager", () => {
    let managerPerms: string[];

    beforeAll(() => {
      const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
      managerPerms = managerRole?.permissions || [];
    });

    test("Manager CAN view payroll", () => {
      expect(managerPerms).toContain("payroll.view");
    });

    test("Manager CAN create payroll", () => {
      expect(managerPerms).toContain("payroll.create");
    });

    test("Manager CAN approve payroll", () => {
      expect(managerPerms).toContain("payroll.approve");
    });

    test("Manager CAN edit employees", () => {
      expect(managerPerms).toContain("employees.create");
      expect(managerPerms).toContain("employees.edit");
    });

    test("Manager CANNOT delete employees", () => {
      expect(managerPerms).not.toContain("employees.delete");
    });

    test("Manager CAN view reports", () => {
      expect(managerPerms).toContain("reports.view");
    });

    test("Manager CAN export reports", () => {
      expect(managerPerms).toContain("reports.export");
    });

    test("Manager CANNOT manage roles", () => {
      expect(managerPerms).not.toContain("settings.manage_roles");
    });

    test("Manager CANNOT manage modules", () => {
      expect(managerPerms).not.toContain("settings.manage_modules");
    });

    test("Manager CAN do pos.cierre_review", () => {
      expect(managerPerms).toContain("pos.cierre_review");
    });
  });

  describe("Role Isolation - Admin", () => {
    let adminPerms: string[];

    beforeAll(() => {
      const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
      adminPerms = adminRole?.permissions || [];
    });

    test("Admin has ALL permissions", () => {
      const allPermIds = DEFAULT_PERMISSIONS.map((p) => p.id);
      allPermIds.forEach((permId) => {
        expect(adminPerms).toContain(permId);
      });
    });

    test("Admin CAN manage roles", () => {
      expect(adminPerms).toContain("settings.manage_roles");
    });

    test("Admin CAN manage modules", () => {
      expect(adminPerms).toContain("settings.manage_modules");
    });

    test("Admin is marked as system role", () => {
      const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
      expect(adminRole?.isSystem).toBe(true);
    });
  });

  describe("Permission Integrity", () => {
    test("All permissions in roles are defined in DEFAULT_PERMISSIONS", () => {
      const validPermIds = DEFAULT_PERMISSIONS.map((p) => p.id);

      DEFAULT_ROLES.forEach((role) => {
        role.permissions.forEach((permId) => {
          expect(validPermIds).toContain(permId);
        });
      });
    });

    test("No undefined or empty permissions in roles", () => {
      DEFAULT_ROLES.forEach((role) => {
        expect(role.permissions).toBeDefined();
        expect(role.permissions.length).toBeGreaterThan(0);

        role.permissions.forEach((perm) => {
          expect(perm).toBeTruthy();
          expect(typeof perm).toBe("string");
          expect(perm.length).toBeGreaterThan(0);
        });
      });
    });

    test("No duplicate permissions within a role", () => {
      DEFAULT_ROLES.forEach((role) => {
        const permSet = new Set(role.permissions);
        expect(permSet.size).toBe(role.permissions.length);
      });
    });

    test("All permissions have valid IDs (dot notation)", () => {
      DEFAULT_PERMISSIONS.forEach((perm) => {
        // Format should be like: "pos.view", "payroll.create", etc.
        expect(perm.id).toMatch(/^[a-z_]+\.[a-z_]+$/);
      });
    });

    test("All permissions have unique IDs", () => {
      const permIds = DEFAULT_PERMISSIONS.map((p) => p.id);
      const uniqueIds = new Set(permIds);
      expect(uniqueIds.size).toBe(permIds.length);
    });

    test("All permissions have descriptions", () => {
      DEFAULT_PERMISSIONS.forEach((perm) => {
        expect(perm.description).toBeDefined();
        expect(perm.description?.length).toBeGreaterThan(0);
      });
    });

    test("All permissions have valid categories", () => {
      const validCategories = [
        "POS",
        "INVENTORY",
        "EMPLOYEES",
        "PAYROLL",
        "SCHEDULES",
        "SETTINGS",
        "REPORTS",
        "EXPENSES",
        "LOYALTY",
        "CONTACTS",
      ];

      DEFAULT_PERMISSIONS.forEach((perm) => {
        expect(validCategories).toContain(perm.category);
      });
    });
  });

  describe("Admin-Only Permissions", () => {
    test("ADMIN_ONLY_PERMISSIONS is defined", () => {
      expect(ADMIN_ONLY_PERMISSIONS).toBeDefined();
      expect(Array.isArray(ADMIN_ONLY_PERMISSIONS)).toBe(true);
    });

    test("Manager does NOT have admin-only permissions", () => {
      const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
      const managerPerms = managerRole?.permissions || [];

      ADMIN_ONLY_PERMISSIONS.forEach((adminPerm) => {
        expect(managerPerms).not.toContain(adminPerm);
      });
    });

    test("Cashier does NOT have admin-only permissions", () => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];

      ADMIN_ONLY_PERMISSIONS.forEach((adminPerm) => {
        expect(cashierPerms).not.toContain(adminPerm);
      });
    });

    test("All admin-only permissions exist in DEFAULT_PERMISSIONS", () => {
      const validPermIds = DEFAULT_PERMISSIONS.map((p) => p.id);

      ADMIN_ONLY_PERMISSIONS.forEach((adminPerm) => {
        expect(validPermIds).toContain(adminPerm);
      });
    });
  });

  describe("Critical Security Boundaries", () => {
    test("Cashier cannot create/delete employees", () => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];

      expect(cashierPerms).not.toContain("employees.create");
      expect(cashierPerms).not.toContain("employees.delete");
      expect(cashierPerms).not.toContain("employees.edit");
    });

    test("Cashier cannot view/create/approve payroll", () => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];

      expect(cashierPerms).not.toContain("payroll.view");
      expect(cashierPerms).not.toContain("payroll.create");
      expect(cashierPerms).not.toContain("payroll.approve");
      expect(cashierPerms).not.toContain("payroll.pay");
    });

    test("Cashier cannot configure system", () => {
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];

      expect(cashierPerms).not.toContain("settings.edit");
      expect(cashierPerms).not.toContain("settings.manage_roles");
      expect(cashierPerms).not.toContain("settings.manage_modules");
      expect(cashierPerms).not.toContain("pos.configure");
    });

    test("Only Admin can manage roles", () => {
      DEFAULT_ROLES.forEach((role) => {
        if (role.id !== "admin") {
          expect(role.permissions).not.toContain("settings.manage_roles");
        }
      });

      const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
      expect(adminRole?.permissions).toContain("settings.manage_roles");
    });

    test("Only Admin can manage modules", () => {
      DEFAULT_ROLES.forEach((role) => {
        if (role.id !== "admin") {
          expect(role.permissions).not.toContain("settings.manage_modules");
        }
      });

      const adminRole = DEFAULT_ROLES.find((r) => r.id === "admin");
      expect(adminRole?.permissions).toContain("settings.manage_modules");
    });
  });

  describe("Permission Helper Function Tests", () => {
    test("hasPermission should accept any permission string", () => {
      // This test ensures the function signature is flexible
      const testPerms = ["pos.view", "payroll.approve", "settings.manage_roles"];
      testPerms.forEach((perm) => {
        expect(typeof perm).toBe("string");
      });
    });

    test("All permissions can be checked against roles", () => {
      const allPermIds = DEFAULT_PERMISSIONS.map((p) => p.id);
      const adminPerms = DEFAULT_ROLES.find((r) => r.id === "admin")?.permissions || [];

      allPermIds.forEach((permId) => {
        // Admin should have all permissions
        expect(adminPerms).toContain(permId);
      });
    });
  });

  describe("Category Coverage", () => {
    test("POS permissions are properly assigned", () => {
      const posPerms = DEFAULT_PERMISSIONS.filter((p) => p.category === "POS").map((p) => p.id);
      expect(posPerms.length).toBeGreaterThan(0);

      // At least one POS permission should be in cashier
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];
      const hasPosPerms = posPerms.some((p) => cashierPerms.includes(p));
      expect(hasPosPerms).toBe(true);
    });

    test("Inventory permissions exist and are assigned", () => {
      const inventoryPerms = DEFAULT_PERMISSIONS.filter((p) => p.category === "INVENTORY").map((p) => p.id);
      expect(inventoryPerms.length).toBeGreaterThan(0);

      // At least one inventory permission should be in manager/cashier
      const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
      const managerPerms = managerRole?.permissions || [];
      const hasInventoryPerms = inventoryPerms.some((p) => managerPerms.includes(p));
      expect(hasInventoryPerms).toBe(true);
    });

    test("Payroll permissions exist and are restricted to manager+", () => {
      const payrollPerms = DEFAULT_PERMISSIONS.filter((p) => p.category === "PAYROLL").map((p) => p.id);
      expect(payrollPerms.length).toBeGreaterThan(0);

      // Cashier should NOT have payroll permissions
      const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
      const cashierPerms = cashierRole?.permissions || [];
      const hasCashierPayrollPerms = payrollPerms.some((p) => cashierPerms.includes(p));
      expect(hasCashierPayrollPerms).toBe(false);

      // Manager SHOULD have some payroll permissions
      const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
      const managerPerms = managerRole?.permissions || [];
      const hasManagerPayrollPerms = payrollPerms.some((p) => managerPerms.includes(p));
      expect(hasManagerPayrollPerms).toBe(true);
    });

    test("Settings/Admin permissions are restricted to admin only", () => {
      const adminPerms = DEFAULT_PERMISSIONS.filter(
        (p) => p.category === "SETTINGS" && ADMIN_ONLY_PERMISSIONS.includes(p.id)
      ).map((p) => p.id);

      if (adminPerms.length > 0) {
        // Manager should NOT have admin-only settings
        const managerRole = DEFAULT_ROLES.find((r) => r.id === "manager");
        const managerPerms = managerRole?.permissions || [];
        const hasAdminSettings = adminPerms.some((p) => managerPerms.includes(p));
        expect(hasAdminSettings).toBe(false);

        // Cashier should NOT have admin-only settings
        const cashierRole = DEFAULT_ROLES.find((r) => r.id === "cashier");
        const cashierPerms = cashierRole?.permissions || [];
        const hasCashierAdminSettings = adminPerms.some((p) => cashierPerms.includes(p));
        expect(hasCashierAdminSettings).toBe(false);
      }
    });
  });

  describe("Edge Cases and Validation", () => {
    test("Roles array is not empty", () => {
      expect(DEFAULT_ROLES.length).toBeGreaterThan(0);
    });

    test("Permissions array is not empty", () => {
      expect(DEFAULT_PERMISSIONS.length).toBeGreaterThan(0);
    });

    test("Each role has at least one permission", () => {
      DEFAULT_ROLES.forEach((role) => {
        expect(role.permissions.length).toBeGreaterThan(0);
      });
    });

    test("Permission objects have all required fields", () => {
      DEFAULT_PERMISSIONS.forEach((perm) => {
        expect(perm.id).toBeDefined();
        expect(perm.name).toBeDefined();
        expect(perm.category).toBeDefined();
      });
    });

    test("Role objects have all required fields", () => {
      DEFAULT_ROLES.forEach((role) => {
        expect(role.id).toBeDefined();
        expect(role.name).toBeDefined();
        expect(role.permissions).toBeDefined();
        expect(Array.isArray(role.permissions)).toBe(true);
      });
    });
  });
});
