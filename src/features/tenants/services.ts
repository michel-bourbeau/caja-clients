// src/features/tenants/services.ts

/**
 * Tenant Management Service
 * Handles tenant CRUD operations
 */

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { Tenant, TenantSettings } from "@/lib/types/tenant";

export class TenantService {
  /**
   * Get all tenants (admin only)
   */
  static async getAllTenants(): Promise<Tenant[]> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching tenants:", error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  static async getTenantById(tenantId: string): Promise<Tenant | null> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
      return data || null;
    } catch (error) {
      console.error("Error fetching tenant:", error);
      throw error;
    }
  }

  /**
   * Get tenant by slug
   */
  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching tenant by slug:", error);
      throw error;
    }
  }

  /**
   * Create new tenant
   */
  static async createTenant(
    name: string,
    slug: string,
    plan: "free" | "pro" | "enterprise" = "free"
  ): Promise<Tenant> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Check if slug already exists
      const existing = await this.getTenantBySlug(slug);
      if (existing) {
        throw new Error(`Slug '${slug}' is already in use`);
      }

      // Default features by plan
      const defaultFeaturesByPlan: Record<string, Record<string, boolean>> = {
        free: {
          pos: true,
          inventory: true,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          expenses: false,
          customRoles: false,
          api: false,
        },
        basic: {
          pos: true,
          inventory: true,
          employees: false,
          schedules: false,
          payroll: false,
          reports: false,
          loyalty: false,
          expenses: false,
          customRoles: true,
          api: false,
        },
        professional: {
          pos: true,
          inventory: true,
          employees: true,
          schedules: true,
          payroll: false,
          reports: true,
          loyalty: true,
          expenses: true,
          customRoles: true,
          api: false,
        },
        enterprise: {
          pos: true,
          inventory: true,
          employees: true,
          schedules: true,
          payroll: true,
          reports: true,
          loyalty: true,
          expenses: true,
          customRoles: true,
          api: true,
        },
      };

      const { data, error } = await supabaseAdmin
        .from("tenants")
        .insert({
          name,
          slug: slug.toLowerCase(),
          plan,
          features: defaultFeaturesByPlan[plan] || defaultFeaturesByPlan.basic,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating tenant:", error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  static async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>
  ): Promise<Tenant> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data, error } = await supabaseAdmin
        .from("tenants")
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .eq("id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating tenant:", error);
      throw error;
    }
  }

  /**
   * Get tenant settings
   */
  static async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    try {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return (
        data || {
          tenantId,
          taxRate: 0.19,
          currency: "NIO",
          timezone: "America/Managua",
          language: "en",
          companyName: "",
        }
      );
    } catch (error) {
      console.error("Error fetching tenant settings:", error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  static async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    try {
      const { data, error } = await supabase
        .from("tenant_settings")
        .upsert({
          tenant_id: tenantId,
          ...settings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating tenant settings:", error);
      throw error;
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  static async deleteTenant(tenantId: string): Promise<void> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("tenants")
        .update({
          deleted_at: new Date(),
        })
        .eq("id", tenantId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting tenant:", error);
      throw error;
    }
  }

  /**
   * Get tenant usage stats
   */
  static async getTenantStats(tenantId: string) {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const [users, products, transactions] = await Promise.all([
        supabaseAdmin.from("users").select("count").eq("tenant_id", tenantId),
        supabaseAdmin
          .from("products")
          .select("count")
          .eq("tenant_id", tenantId),
        supabaseAdmin
          .from("transactions")
          .select("count")
          .eq("tenant_id", tenantId),
      ]);

      return {
        totalUsers: users.count || 0,
        totalProducts: products.count || 0,
        totalTransactions: transactions.count || 0,
      };
    } catch (error) {
      console.error("Error fetching tenant stats:", error);
      throw error;
    }
  }
}
