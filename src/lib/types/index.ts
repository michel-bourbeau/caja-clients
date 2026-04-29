/**
 * Central type exports for the entire application
 *
 * All types are organized into categories:
 * - domain: Core business entities (Product, Transaction, Employee, etc.)
 * - components: UI component types (FlashState, ReceiptSettings)
 * - services: Service and utility types (Tax, ValidationError, PaymentStatus)
 * - api: API request/response types (PayrollConfig, PeriodInfo)
 * - context: React context types (AuthContextType, ImpersonationSession)
 * - roles: Role and permission types (moved separately to roles.ts)
 * - tenant: Tenant configuration types (moved separately to tenant.ts)
 * - contacts: Contact types (moved separately to contacts.ts)
 *
 * For best practices with NextJS and clean code:
 * - Import specific types: `import { Product, User } from "@/lib/types"`
 * - Never import the entire namespace: `import * as Types`
 * - Keep types organized by domain and responsibility
 */

// ────────────────────────────────────────────────────────────────────────────
// Domain types
// ────────────────────────────────────────────────────────────────────────────

export {
  // Product/Inventory
  type Product,
  type Category,
  type InventoryMovement,
  // Transactions
  type CartItem,
  type Transaction,
  // Employees
  type Employee,
  type EmployeeSchedule,
  type TimeEntry,
  // Payroll
  type PayrollPeriod,
  type Payroll,
  // Auth
  type User,
  // Loyalty
  type LoyalCustomer,
  type LoyalCustomerStats,
  type LoyaltyReward,
  type LoyaltyTransaction,
  // Expenses
  type Supplier,
  type ExpenseCategory,
  type Expense,
  type FixedExpense,
} from "./domain";

// ────────────────────────────────────────────────────────────────────────────
// Component types
// ────────────────────────────────────────────────────────────────────────────

export {
  type FlashVariant,
  type FlashState,
  type ReceiptSettings,
} from "./components";

// ────────────────────────────────────────────────────────────────────────────
// Service and utility types
// ────────────────────────────────────────────────────────────────────────────

export {
  type ValidationError,
  type Tax,
  type PaymentStatus,
} from "./services";

// ────────────────────────────────────────────────────────────────────────────
// API types
// ────────────────────────────────────────────────────────────────────────────

export {
  type PayrollConfig,
  type PeriodInfo,
} from "./api";

// ────────────────────────────────────────────────────────────────────────────
// Context types
// ────────────────────────────────────────────────────────────────────────────

export {
  type AuthContextType,
  type ImpersonationSession,
  type EmployeeImpersonationSession,
} from "./context";

// ────────────────────────────────────────────────────────────────────────────
// Other domain-specific types (in separate files)
// ────────────────────────────────────────────────────────────────────────────

export type { Role, Permission, RoleWithCount } from "./roles";
export type { Tenant } from "./tenant";
export type { Contact } from "./contacts";
