// Application constants

export const APP_NAME = "Caja";
export const APP_VERSION = "1.0.0";

// Tax and currency settings
export const TAX_RATE = 0.21; // 21% for Argentina
export const CURRENCY = "ARS";

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  
  // POS
  POS: "/dashboard/pos",
  TRANSACTIONS: "/dashboard/transactions",
  CIERRE: "/dashboard/pos/cierre",
  
  // Inventory
  INVENTORY: "/dashboard/inventory",
  PRODUCTS: "/dashboard/inventory",
  CATEGORIES: "/dashboard/inventory",
  MOVEMENTS: "/dashboard/inventory",
  
  // Employees
  EMPLOYEES: "/dashboard/employees",
  EMPLOYEE_DETAIL: "/dashboard/employees/:id",
  
  // Schedules
  SCHEDULES: "/dashboard/schedules",
  
  // Payroll
  PAYROLL: "/dashboard/payroll",
  PAYROLL_PERIODS: "/dashboard/payroll",
  PAYROLL_DETAIL: "/dashboard/payroll/:id",
  
  // Reports
  REPORTS: "/dashboard/reports",
  
  // Auth
  LOGIN: "/login",
  LOGOUT: "/logout",
  
  // Settings
  SETTINGS: "/dashboard/settings",
};

export const EMPLOYEE_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export const PAYMENT_METHODS = {
  CASH: "CASH",
  CARD: "CARD",
  TRANSFER: "TRANSFER",
} as const;

export const TRANSACTION_STATUS = {
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYROLL_STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  PAID: "PAID",
} as const;

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
