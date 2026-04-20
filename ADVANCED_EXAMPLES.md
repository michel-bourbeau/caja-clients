// Advanced examples of permission checking and role management

import { useAuth } from "@/context/AuthContext";
import { RoleService } from "@/features/roles/services";
import { ProtectedComponent, PermissionButton, usePermissions } from "@/components/ProtectedComponent";
import { DEFAULT_PERMISSIONS, Role } from "@/lib/types/roles";

// ============================================
// EXAMPLE 1: Render component based on single permission
// ============================================
export function Example1_SinglePermission() {
  return (
    <ProtectedComponent permission="pos.create">
      <button>Create Sale</button>
    </ProtectedComponent>
  );
}

// ============================================
// EXAMPLE 2: Render component if ANY permission exists
// ============================================
export function Example2_AnyPermission() {
  return (
    <ProtectedComponent permission={["pos.create", "inventory.edit", "payroll.approve"]}>
      <div>You have at least one management permission</div>
    </ProtectedComponent>
  );
}

// ============================================
// EXAMPLE 3: Render component only if ALL permissions exist
// ============================================
export function Example3_AllPermissions() {
  return (
    <ProtectedComponent
      permission={["employees.view", "employees.edit", "payroll.approve"]}
      requireAll={true}
    >
      <button>Advanced Employee Management</button>
    </ProtectedComponent>
  );
}

// ============================================
// EXAMPLE 4: Show fallback if no permission
// ============================================
export function Example4_WithFallback() {
  return (
    <ProtectedComponent
      permission="inventory.delete"
      fallback={<p>You don't have permission to delete items</p>}
    >
      <button>Delete Item</button>
    </ProtectedComponent>
  );
}

// ============================================
// EXAMPLE 5: Dynamic navigation based on permissions
// ============================================
export function Example5_DynamicNavigation() {
  const { hasPermission } = useAuth();

  const navigationItems = [
    { label: "POS", href: "/dashboard/pos", permission: "pos.view" },
    { label: "Inventory", href: "/dashboard/inventory", permission: "inventory.view" },
    { label: "Employees", href: "/dashboard/employees", permission: "employees.view" },
    { label: "Payroll", href: "/dashboard/payroll", permission: "payroll.view" },
    { label: "Schedules", href: "/dashboard/schedules", permission: "schedules.view" },
    { label: "Settings", href: "/dashboard/settings", permission: "settings.view" },
  ];

  return (
    <nav>
      {navigationItems
        .filter((item) => hasPermission(item.permission))
        .map((item) => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
    </nav>
  );
}

// ============================================
// EXAMPLE 6: Conditional form fields
// ============================================
export function Example6_ConditionalFields() {
  const { hasPermission } = useAuth();

  return (
    <form>
      <input type="text" placeholder="Name" required />

      {hasPermission("pos.configure") && (
        <>
          <input type="number" placeholder="Tax %" />
          <input type="text" placeholder="POS ID" />
        </>
      )}

      {hasPermission("employees.edit") && (
        <>
          <input type="text" placeholder="Department" />
          <input type="text" placeholder="Manager" />
        </>
      )}

      <button type="submit">Save</button>
    </form>
  );
}

// ============================================
// EXAMPLE 7: Data-driven permission checks
// ============================================
export function Example7_DataDriven() {
  const { hasAnyPermission } = useAuth();

  const actions = [
    { name: "Create", permission: "pos.create", icon: "➕" },
    { name: "Edit", permission: "pos.configure", icon: "✏️" },
    { name: "Delete", permission: "inventory.delete", icon: "🗑️" },
    { name: "Export", permission: "settings.view", icon: "📤" },
  ];

  const availableActions = actions.filter((action) =>
    hasAnyPermission([action.permission])
  );

  return (
    <div className="button-group">
      {availableActions.map((action) => (
        <button key={action.name}>
          {action.icon} {action.name}
        </button>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 8: Role-based data filtering
// ============================================
export function Example8_FilterByRole() {
  const { user } = useAuth();

  const sensitiveData = [
    { title: "Employee Salaries", permission: "payroll.view", visible: true },
    { title: "System Logs", permission: "settings.view", visible: true },
    { title: "Audit Trail", permission: "settings.manage_roles", visible: true },
  ];

  const userCanSee = sensitiveData.filter((item) =>
    user?.permissions.includes(item.permission)
  );

  return (
    <div>
      {userCanSee.map((item) => (
        <div key={item.title}>
          <h3>{item.title}</h3>
          <p>You have access to this</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 9: Advanced role creation
// ============================================
export async function Example9_CreateAdvancedRole() {
  // Supervisor role with limited permissions
  const supervisorPermissions = [
    // Can view everything
    "pos.view",
    "inventory.view",
    "employees.view",
    "schedules.view",
    "payroll.view",

    // Can manage schedules
    "schedules.edit",

    // Can approve payroll but not pay
    "payroll.approve",
  ];

  const supervisor = await RoleService.createRole(
    "Supervisor",
    "Supervises operations without full admin access",
    supervisorPermissions
  );

  return supervisor;
}

// ============================================
// EXAMPLE 10: Permission-aware error handling
// ============================================
export function Example10_ErrorHandling() {
  const { hasPermission } = useAuth();

  async function deleteItem(itemId: string) {
    if (!hasPermission("inventory.delete")) {
      throw new Error("You don't have permission to delete items");
    }

    try {
      // API call here
      const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  }

  return (
    <button
      onClick={() => {
        try {
          deleteItem("123");
        } catch (error) {
          alert(String(error));
        }
      }}
    >
      Delete
    </button>
  );
}

// ============================================
// EXAMPLE 11: Creating role templates
// ============================================
export const ROLE_TEMPLATES = {
  // Retail store roles
  retailStore: {
    cashier: {
      name: "Cashier",
      permissions: ["pos.create", "pos.view", "inventory.view", "schedules.checkin"],
    },
    stockist: {
      name: "Stockist",
      permissions: [
        "inventory.view",
        "inventory.edit",
        "inventory.adjust",
        "schedules.checkin",
      ],
    },
    manager: {
      name: "Store Manager",
      permissions: [
        "pos.view",
        "inventory.view",
        "inventory.edit",
        "employees.view",
        "employees.edit",
        "schedules.view",
        "schedules.edit",
      ],
    },
  },

  // Factory roles
  factory: {
    operator: {
      name: "Machine Operator",
      permissions: ["inventory.view", "inventory.adjust", "schedules.checkin"],
    },
    qcManager: {
      name: "QC Manager",
      permissions: [
        "inventory.view",
        "inventory.edit",
        "inventory.delete",
        "schedules.view",
      ],
    },
    productionManager: {
      name: "Production Manager",
      permissions: [
        "inventory.view",
        "inventory.edit",
        "inventory.adjust",
        "employees.view",
        "employees.edit",
        "schedules.view",
        "schedules.edit",
      ],
    },
  },
};

// ============================================
// EXAMPLE 12: Using templates to create roles
// ============================================
export async function Example12_UseTemplates() {
  for (const templateRole of Object.values(ROLE_TEMPLATES.retailStore)) {
    await RoleService.createRole(templateRole.name, "", templateRole.permissions);
  }

  for (const templateRole of Object.values(ROLE_TEMPLATES.factory)) {
    await RoleService.createRole(templateRole.name, "", templateRole.permissions);
  }
}

// ============================================
// EXAMPLE 13: Permission statistics
// ============================================
export function Example13_PermissionStats() {
  const { user } = useAuth();

  if (!user) return null;

  const categories: Record<string, number> = {};
  user.permissions.forEach((perm) => {
    const category = perm.split(".")[0];
    categories[category] = (categories[category] || 0) + 1;
  });

  return (
    <div>
      <h2>Your Permissions</h2>
      <p>Total: {user.permissions.length}</p>
      <ul>
        {Object.entries(categories).map(([category, count]) => (
          <li key={category}>
            {category}: {count} permissions
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// EXAMPLE 14: Combining multiple checks
// ============================================
export function Example14_CombinedChecks() {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // User is admin (has all permissions)
  const isAdmin = user?.permissions.length === 25;

  // User is manager (has most permissions)
  const isManager = hasAllPermissions([
    "employees.view",
    "employees.edit",
    "payroll.view",
    "schedules.view",
  ]);

  // User can do financial operations
  const canFinance = hasAllPermissions(["payroll.view", "payroll.approve"]);

  // User can do any operational task
  const canOperate = hasAnyPermission([
    "pos.create",
    "inventory.edit",
    "employees.create",
  ]);

  return (
    <div>
      {isAdmin && <p>You are an administrator</p>}
      {isManager && <p>You are a manager</p>}
      {canFinance && <p>You can manage finances</p>}
      {canOperate && <p>You can perform operations</p>}
    </div>
  );
}

// ============================================
// EXAMPLE 15: Permission audit trail
// ============================================
export function Example15_AuditTrail() {
  const { user } = useAuth();

  type AuditLog = {
    timestamp: Date;
    action: string;
    permission: string;
    success: boolean;
  };

  const auditLog: AuditLog[] = [];

  function logPermissionCheck(action: string, permission: string, hasAccess: boolean) {
    auditLog.push({
      timestamp: new Date(),
      action,
      permission,
      success: hasAccess,
    });
  }

  return (
    <div>
      <h2>Audit Log</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Permission</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {auditLog.map((log, i) => (
            <tr key={i}>
              <td>{log.timestamp.toLocaleTimeString()}</td>
              <td>{log.action}</td>
              <td>{log.permission}</td>
              <td>{log.success ? "✓ Allowed" : "✗ Denied"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
