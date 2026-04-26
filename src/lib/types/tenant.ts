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
