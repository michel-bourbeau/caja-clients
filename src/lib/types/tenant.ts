// src/lib/types/tenant.ts

/**
 * Multi-Tenant Architecture Types
 * Defines the structure for managing multiple clients
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier (e.g., "chocorico", "boulangerie-paris")
  plan: "free" | "pro" | "enterprise";
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  currency?: string; // USD, EUR, CAD, etc
  language?: string; // en, es, fr
  maxUsers?: number;
  maxProducts?: number;
  trial_ends_at?: string | Date | null; // Date d'expiration de l'essai gratuit
  is_paid?: boolean; // Si le tenant a un abonnement payant
  paid_until?: string | Date | null; // Jusqu'à quand le client a payé
  plan_price_at_subscription?: number; // Prix qu'il avait quand il a souscrit
  current_plan_price?: number; // Prix actuel du plan
  features: {
    pos: boolean;
    inventory: boolean;
    employees: boolean;
    payroll: boolean;
    schedules: boolean;
    reports: boolean;
    loyalty: boolean;
    expenses: boolean;
    customRoles: boolean;
    api: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Feature flags map returned by GET /api/tenants/[tenantId]/features.
 * All keys are optional/boolean so unknown modules don't break consumers.
 */
export interface TenantFeatures {
  pos?: boolean;
  inventory?: boolean;
  employees?: boolean;
  schedules?: boolean;
  payroll?: boolean;
  reports?: boolean;
  loyalty?: boolean;
  expenses?: boolean;
  taxes?: boolean;
  settings?: boolean;
  contacts?: boolean;
  [key: string]: boolean | undefined;
}

export interface TenantSettings {
  tenantId: string;
  taxRate: number; // IVA
  currency: string;
  timezone: string;
  language: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logo?: string;
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  userRole: string;
  permissions: string[];
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  status: "ACTIVE" | "INACTIVE";
  lastLogin?: Date;
  createdAt: Date;
}

// Helper type for adding tenant_id to any entity
export type WithTenant<T> = T & {
  tenant_id: string;
};

// Plan pricing tracking
export interface PlanPrice {
  id: string;
  plan: "basic" | "professional" | "enterprise" | "custom";
  price: number;
  currency: string;
  effective_date: string | Date;
  created_at: string | Date;
}

// Payment history for tenants
export interface PaymentHistory {
  id: string;
  tenant_id: string;
  plan: "basic" | "professional" | "enterprise" | "custom";
  amount: number;
  paid_until: string | Date;
  payment_date: string | Date;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string | Date;
  updated_at: string | Date;
}
