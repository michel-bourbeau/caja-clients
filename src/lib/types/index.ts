// Domain types for the POS system

// ========== Product/Inventory ==========
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  reason: string;
  timestamp: Date;
  userId: string;
}

// ========== POS/Transactions ==========
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "CARD" | "TRANSFER";
  timestamp: Date;
  cashierId: string;
  status: "COMPLETED" | "CANCELLED";
}

// ========== Employees ==========
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string; // ID del rol personalizado
  hireDate: Date;
  salary: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSchedule {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isWorking: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  date: Date;
}

// ========== Payroll ==========
export interface PayrollPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  status: "PENDING" | "PROCESSED" | "PAID";
}

export interface Payroll {
  id: string;
  employeeId: string;
  periodId: string;
  baseSalary: number;
  hoursWorked: number;
  bonuses: number;
  deductions: number;
  total: number;
  status: "DRAFT" | "APPROVED" | "PAID";
}

// ========== Auth ==========
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string; // ID del rol personalizado
  permissions: string[]; // Permisos del usuario
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}
