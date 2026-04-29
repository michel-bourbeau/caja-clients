import { getSupabaseAdmin } from "@/lib/supabase";

interface DisableResult {
  success: boolean;
  modulesDisabled: boolean;
  usersDisabled: number;
  error?: string;
}

interface EnableResult {
  success: boolean;
  modulesEnabled: boolean;
  usersEnabled: number;
  error?: string;
}

/**
 * Disable all modules and non-admin users for a tenant due to expired payment
 * NOTE: Admins (role_id = 'admin') remain ACTIVE to access the dashboard and see payment alert
 */
export async function disableTenantAccess(tenantId: string): Promise<DisableResult> {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Disable all modules (features stored as JSONB in tenants table)
    const disabledFeatures = {
      pos: false,
      inventory: false,
      employees: false,
      schedules: false,
      payroll: false,
      reports: false,
      loyalty: false,
      expenses: false,
      taxes: false,
      contacts: false,
      customRoles: false,
      api: false,
    };

    const { error: modulesError } = await supabase
      .from("tenants")
      .update({ features: disabledFeatures })
      .eq("id", tenantId);

    if (modulesError) {
      console.error("Error disabling modules:", modulesError);
      return {
        success: false,
        modulesDisabled: false,
        usersDisabled: 0,
        error: `Failed to disable modules: ${modulesError.message}`,
      };
    }

    // 2. Disable all non-admin users for this tenant (keep admins active)
    const { error: usersError, data: usersData } = await supabase
      .from("users")
      .update({ status: "INACTIVE" })
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .neq("role_id", "admin") // Keep admins active to see payment alert
      .select("id");

    if (usersError) {
      console.error("Error disabling users:", usersError);
      return {
        success: false,
        modulesDisabled: true,
        usersDisabled: 0,
        error: `Failed to disable users: ${usersError.message}`,
      };
    }

    const usersDisabledCount = usersData?.length ?? 0;

    // 3. Disable all employees (set status to INACTIVE)
    const { error: employeesError, data: employeesData } = await supabase
      .from("employees")
      .update({ status: "INACTIVE" })
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .select("id");

    if (employeesError) {
      console.error("Error disabling employees:", employeesError);
      return {
        success: false,
        modulesDisabled: true,
        usersDisabled: usersDisabledCount,
        error: `Failed to disable employees: ${employeesError.message}`,
      };
    }

    const employeesDisabledCount = employeesData?.length ?? 0;

    console.log(
      `Tenant ${tenantId} access disabled: ${usersDisabledCount} users, ${employeesDisabledCount} employees`
    );

    return {
      success: true,
      modulesDisabled: true,
      usersDisabled: usersDisabledCount + employeesDisabledCount,
    };
  } catch (error) {
    console.error("Error disabling tenant access:", error);
    return {
      success: false,
      modulesDisabled: false,
      usersDisabled: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Re-enable modules and users for a tenant after payment is registered
 * NOTE: Admins were never disabled, so they re-enable with other users automatically
 */
export async function enableTenantAccess(tenantId: string): Promise<EnableResult> {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Get the tenant's plan config to restore modules
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return {
        success: false,
        modulesEnabled: false,
        usersEnabled: 0,
        error: "Tenant not found",
      };
    }

    // 2. Get default modules for this plan
    const defaultModulesByPlan: Record<string, Record<string, boolean>> = {
      basic: {
        pos: true,
        inventory: true,
        employees: false,
        schedules: false,
        payroll: false,
        reports: false,
        loyalty: false,
        expenses: false,
        taxes: false,
        contacts: false,
        customRoles: false,
        api: false,
      },
      professional: {
        pos: true,
        inventory: true,
        employees: true,
        schedules: true,
        payroll: true,
        reports: true,
        loyalty: false,
        expenses: false,
        taxes: true,
        contacts: true,
        customRoles: false,
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
        taxes: true,
        contacts: true,
        customRoles: true,
        api: true,
      },
      custom: {
        pos: false,
        inventory: false,
        employees: false,
        schedules: false,
        payroll: false,
        reports: false,
        loyalty: false,
        expenses: false,
        taxes: false,
        contacts: false,
        customRoles: false,
        api: false,
      },
    };

    const modulesForPlan = defaultModulesByPlan[tenant.plan] || defaultModulesByPlan.basic;

    // 3. Re-enable modules based on plan (update features JSONB column)
    const { error: modulesError } = await supabase
      .from("tenants")
      .update({ features: modulesForPlan })
      .eq("id", tenantId);

    if (modulesError) {
      console.error("Error enabling modules:", modulesError);
      return {
        success: false,
        modulesEnabled: false,
        usersEnabled: 0,
        error: `Failed to enable modules: ${modulesError.message}`,
      };
    }

    // 4. Re-enable all users for this tenant
    const { error: usersError, data: usersData } = await supabase
      .from("users")
      .update({ status: "ACTIVE" })
      .eq("tenant_id", tenantId)
      .eq("status", "INACTIVE")
      .select("id");

    if (usersError) {
      console.error("Error enabling users:", usersError);
      // Don't fail - modules are already enabled
    }

    const usersEnabledCount = usersData?.length ?? 0;

    // 5. Re-enable all employees for this tenant
    const { error: employeesError, data: employeesData } = await supabase
      .from("employees")
      .update({ status: "ACTIVE" })
      .eq("tenant_id", tenantId)
      .eq("status", "INACTIVE")
      .select("id");

    if (employeesError) {
      console.error("Error enabling employees:", employeesError);
      // Don't fail - modules are already enabled
    }

    const employeesEnabledCount = employeesData?.length ?? 0;

    console.log(
      `Tenant ${tenantId} access enabled: ${usersEnabledCount} users, ${employeesEnabledCount} employees`
    );

    return {
      success: true,
      modulesEnabled: true,
      usersEnabled: usersEnabledCount + employeesEnabledCount,
    };
  } catch (error) {
    console.error("Error enabling tenant access:", error);
    return {
      success: false,
      modulesEnabled: false,
      usersEnabled: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if tenant is suspended due to expired payment (>3 days)
 */
export async function isTenantSuspended(tenantId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("paid_until")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) return false;
    if (!tenant.paid_until) return false;

    const paidUntil = new Date(tenant.paid_until);
    const now = new Date();
    const daysExpired = Math.ceil((now.getTime() - paidUntil.getTime()) / (1000 * 60 * 60 * 24));

    return daysExpired > 3;
  } catch (error) {
    console.error("Error checking tenant suspension:", error);
    return false;
  }
}
