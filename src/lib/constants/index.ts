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
  POS: "/pos",
  TRANSACTIONS: "/transactions",
  
  // Inventory
  INVENTORY: "/inventory",
  PRODUCTS: "/inventory/products",
  CATEGORIES: "/inventory/categories",
  MOVEMENTS: "/inventory/movements",
  
  // Employees
  EMPLOYEES: "/employees",
  EMPLOYEE_DETAIL: "/employees/:id",
  
  // Schedules
  SCHEDULES: "/schedules",
  
  // Payroll
  PAYROLL: "/payroll",
  PAYROLL_PERIODS: "/payroll/periods",
  PAYROLL_DETAIL: "/payroll/:id",
  
  // Auth
  LOGIN: "/login",
  LOGOUT: "/logout",
  
  // Settings
  SETTINGS: "/settings",
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
