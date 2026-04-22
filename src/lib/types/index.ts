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
  sort_order?: number;
  min_stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order?: number;
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
  variantId?: string;       // set when the cart item is a product variant
  name?: string;
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
  cashierName?: string;
  status: "COMPLETED" | "CANCELLED";
  amount_received?: number;
  change?: number;
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
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

// ========== Loyalty/Customers ==========
export interface LoyalCustomer {
  id: string;
  tenant_id: string;
  card_number: string;
  name: string;
  phone?: string;
  email?: string;
  total_accumulated: number;
  total_visits: number;
  last_purchase_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoyalCustomerStats extends LoyalCustomer {
  current_counter?: number; // montant depuis dernière récompense
  next_reward_amount?: number; // montant avant prochaine récompense
  last_reward_date?: Date;
}

export interface LoyaltyReward {
  id: string;
  loyal_customer_id: string;
  reward_date: Date;
  amount_at_reward: number;
  reward_type: string; // DISCOUNT, POINTS, GIFT, etc
  reward_value?: number;
  notes?: string;
  created_at: Date;
}

export interface LoyaltyTransaction {
  id: string;
  loyal_customer_id: string;
  transaction_id?: string;
  amount: number;
  purchase_date: Date;
  description?: string;
}

// ========== Expenses ==========
export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  contact?: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  tenant_id: string;
  supplier_id?: string;
  supplier?: Supplier;
  created_by: string;
  creator?: User;
  amount: number;
  description?: string;
  category?: string;
  expense_date: Date;
  is_recurring: boolean;
  recurring_day_of_month?: number;
  status: "RECORDED" | "APPROVED" | "PAID";
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
