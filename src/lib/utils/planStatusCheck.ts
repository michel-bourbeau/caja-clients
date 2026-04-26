import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isTenantSuspended } from "./tenantAccessControl";

export async function checkPlanStatus(tenantId: string) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("paid_until")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) {
      return {
        isValid: false,
        reason: "Tenant not found",
      };
    }

    if (!tenant.paid_until) {
      // No payment info - allow access
      return { isValid: true };
    }

    const paidUntil = new Date(tenant.paid_until);
    const now = new Date();
    const daysExpired = Math.ceil((now.getTime() - paidUntil.getTime()) / (1000 * 60 * 60 * 24));

    // Check if suspended (expired more than 3 days)
    const suspended = await isTenantSuspended(tenantId);

    if (suspended) {
      return {
        isValid: false,
        reason: "Plan expired more than 3 days ago - account suspended",
        daysExpired,
        suspended: true,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error checking plan status:", error);
    return {
      isValid: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function respondWithExpiredPlan() {
  return NextResponse.json(
    {
      error: "Suscripción expirada",
      message: "Tu suscripción ha expirado y tu cuenta está suspendida. Contacta con el administrador para renovar.",
      code: "SUBSCRIPTION_SUSPENDED",
    },
    { status: 403 }
  );
}
