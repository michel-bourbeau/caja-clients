// Role Management Types

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean; // Rôles système non supprimables (ADMIN)
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: "POS" | "INVENTORY" | "EMPLOYEES" | "PAYROLL" | "SCHEDULES" | "SETTINGS" | "REPORTS" | "EXPENSES" | "LOYALTY" | "CONTACTS";
}

export interface RoleWithCount extends Role {
  employeeCount: number;
}

// Default permissions
export const DEFAULT_PERMISSIONS: Permission[] = [
  // POS Permissions
  {
    id: "pos.create",
    name: "Crear venta",
    category: "POS",
    description: "Crear nuevas transacciones de venta",
  },
  {
    id: "pos.view",
    name: "Ver ventas",
    category: "POS",
    description: "Ver historial de transacciones",
  },
  {
    id: "pos.void",
    name: "Anular venta",
    category: "POS",
    description: "Anular transacciones de venta",
  },
  {
    id: "pos.configure",
    name: "Configurar POS",
    category: "POS",
    description: "Configurar opciones del punto de venta",
  },
  {
    id: "pos.cierre",
    name: "Realizar cierre de caja",
    category: "POS",
    description: "Declarar el efectivo contado y el reporte de terminal al cierre del d\u00eda",
  },
  {
    id: "pos.cierre_review",
    name: "Revisar cierre de caja",
    category: "POS",
    description: "Ver totales del sistema, diferencias y generar el reporte de cierre (gerentes y administradores)",
  },

  // Inventory Permissions
  {
    id: "inventory.view",
    name: "Ver inventario",
    category: "INVENTORY",
    description: "Ver productos y stock",
  },
  {
    id: "inventory.create",
    name: "Agregar productos",
    category: "INVENTORY",
    description: "Crear nuevos productos",
  },
  {
    id: "inventory.edit",
    name: "Editar productos",
    category: "INVENTORY",
    description: "Modificar información de productos",
  },
  {
    id: "inventory.delete",
    name: "Eliminar productos",
    category: "INVENTORY",
    description: "Eliminar productos del sistema",
  },
  {
    id: "inventory.adjust",
    name: "Ajustar stock",
    category: "INVENTORY",
    description: "Ajustar niveles de stock manualmente",
  },

  // Employee Permissions
  {
    id: "employees.view",
    name: "Ver empleados",
    category: "EMPLOYEES",
    description: "Ver lista de empleados",
  },
  {
    id: "employees.create",
    name: "Agregar empleados",
    category: "EMPLOYEES",
    description: "Crear nuevos empleados",
  },
  {
    id: "employees.edit",
    name: "Editar empleados",
    category: "EMPLOYEES",
    description: "Modificar información de empleados",
  },
  {
    id: "employees.delete",
    name: "Eliminar empleados",
    category: "EMPLOYEES",
    description: "Eliminar empleados del sistema",
  },

  // Schedule Permissions
  {
    id: "schedules.view",
    name: "Ver horarios",
    category: "SCHEDULES",
    description: "Ver programación de turnos",
  },
  {
    id: "schedules.edit",
    name: "Editar horarios",
    category: "SCHEDULES",
    description: "Modificar programación de turnos",
  },
  {
    id: "schedules.checkin",
    name: "Check-in/out",
    category: "SCHEDULES",
    description: "Registrar entrada y salida",
  },

  // Payroll Permissions
  {
    id: "payroll.view",
    name: "Ver nómina",
    category: "PAYROLL",
    description: "Ver recibos de sueldo",
  },
  {
    id: "payroll.create",
    name: "Crear nómina",
    category: "PAYROLL",
    description: "Generar períodos de pago",
  },
  {
    id: "payroll.approve",
    name: "Aprobar nómina",
    category: "PAYROLL",
    description: "Aprobar recibos de sueldo",
  },
  {
    id: "payroll.pay",
    name: "Procesar pago",
    category: "PAYROLL",
    description: "Marcar nómina como pagada",
  },

  // Expenses Permissions
  {
    id: "expenses.create",
    name: "Registrar gasto",
    category: "EXPENSES",
    description: "Crear nuevo gasto",
  },
  {
    id: "expenses.view_all",
    name: "Ver todos los gastos",
    category: "EXPENSES",
    description: "Ver todos los gastos registrados",
  },
  {
    id: "expenses.view_own",
    name: "Ver mis gastos",
    category: "EXPENSES",
    description: "Ver solo los gastos que registré",
  },
  {
    id: "expenses.edit",
    name: "Editar gastos",
    category: "EXPENSES",
    description: "Modificar gastos registrados",
  },
  {
    id: "expenses.manage_suppliers",
    name: "Gestionar proveedores",
    category: "EXPENSES",
    description: "Crear y modificar proveedores",
  },

  // Reports Permissions
  {
    id: "reports.view",
    name: "Ver reportes",
    category: "REPORTS",
    description: "Ver reportes de ventas y estadísticas",
  },
  {
    id: "reports.export",
    name: "Exportar reportes",
    category: "REPORTS",
    description: "Exportar reportes a CSV y PDF",
  },

  // Settings Permissions
  {
    id: "settings.view",
    name: "Ver configuración",
    category: "SETTINGS",
    description: "Ver configuración del sistema",
  },
  {
    id: "settings.edit",
    name: "Editar configuración",
    category: "SETTINGS",
    description: "Modificar configuración del sistema",
  },
  {
    id: "settings.manage_roles",
    name: "Gestionar roles",
    category: "SETTINGS",
    description: "Crear, editar y eliminar roles",
  },
  {
    id: "settings.manage_modules",
    name: "Gestionar módulos",
    category: "SETTINGS",
    description: "Activar/desactivar módulos y configurar opciones",
  },

  // Contacts Permissions
  {
    id: "contacts.view",
    name: "Ver contactos",
    category: "CONTACTS",
    description: "Ver lista de contactos importants",
  },
  {
    id: "contacts.create",
    name: "Agregar contactos",
    category: "CONTACTS",
    description: "Crear nuevos contactos",
  },
  {
    id: "contacts.edit",
    name: "Editar contactos",
    category: "CONTACTS",
    description: "Modificar información de contactos",
  },
  {
    id: "contacts.delete",
    name: "Eliminar contactos",
    category: "CONTACTS",
    description: "Eliminar contactos",
  },

  // Loyalty Permissions
  {
    id: "loyalty.view",
    name: "Ver clientes fieles",
    category: "LOYALTY",
    description: "Ver programa de fidelización y clientes",
  },
];

// Default Roles
export const DEFAULT_ROLES: Omit<Role, "createdAt" | "updatedAt">[] = [
  {
    id: "admin",
    name: "Administrador",
    description: "Acceso total al sistema",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.id),
    isSystem: true,
  },
  {
    id: "manager",
    name: "Gerente",
    description: "Gestión de empleados, nómina y reportes",
    permissions: [
      "employees.view",
      "employees.create",
      "employees.edit",
      "schedules.view",
      "schedules.edit",
      "payroll.view",
      "payroll.create",
      "payroll.approve",
      "inventory.view",
      "pos.view",
      "pos.cierre",
      "pos.cierre_review",
      "reports.view",
      "reports.export",
    ],
    isSystem: true,
  },
  {
    id: "cashier",
    name: "Vendedor",
    description: "Ventas y manejo de cajas",
    permissions: ["pos.create", "pos.view", "inventory.view", "schedules.checkin", "pos.cierre"],
    isSystem: true,
  },
];

// Permissions only admins can manage
export const ADMIN_ONLY_PERMISSIONS = ["settings.manage_modules"];
