import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { disableTenantAccess, enableTenantAccess } from "@/lib/utils/tenantAccessControl";

/**
 * POST /api/superadmin/payment/check-expirations
 * Check all tenants for expired payments and apply suspensions
 * Should be called as a cron job
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();

    // Get all tenants with expired payments (>3 days)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const { data: expiredTenants, error: fetchError } = await supabase
      .from("tenants")
      .select("id, name, paid_until")
      .not("paid_until", "is", null)
      .lt("paid_until", threeDaysAgo.toISOString());

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch expired tenants: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const results = {
      checked: expiredTenants?.length ?? 0,
      suspended: 0,
      reactivated: 0,
      errors: [] as string[],
    };

    // Process each expired tenant
    if (expiredTenants && expiredTenants.length > 0) {
      for (const tenant of expiredTenants) {
        try {
          // Check if already suspended
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("features")
            .eq("id", tenant.id)
            .single();

          if (tenantData && tenantData.features && tenantData.features.pos === true) {
            // Not suspended yet, suspend it
            const disableResult = await disableTenantAccess(tenant.id);
            if (disableResult.success) {
              results.suspended++;
              console.log(
                `Suspended tenant ${tenant.id} (${tenant.name}) - ${disableResult.usersDisabled} users/employees disabled`
              );
            } else {
              results.errors.push(`Failed to suspend ${tenant.id}: ${disableResult.error}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Error processing ${tenant.id}: ${errorMsg}`);
        }
      }
    }

    return NextResponse.json({
      message: "Payment expiration check completed",
      ...results,
    });
  } catch (error) {
    console.error("POST payment check-expirations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
