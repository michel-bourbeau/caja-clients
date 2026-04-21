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
  category: "POS" | "INVENTORY" | "EMPLOYEES" | "PAYROLL" | "SCHEDULES" | "SETTINGS" | "REPORTS";
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
