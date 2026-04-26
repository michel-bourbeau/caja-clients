import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { disableTenantAccess } from "@/lib/utils/tenantAccessControl";

/**
 * POST /api/superadmin/tenants/[tenantId]/payment/cancel
 * Cancel payment for a tenant and suspend all access
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId manquant" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, paid_until")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      );
    }

    // 1. Cancel payment (set paid_until to null AND is_paid to false)
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ 
        paid_until: null,
        is_paid: false  // ✅ NOUVEAU - Mark as unpaid
      })
      .eq("id", tenantId);

    if (updateError) {
      console.error("Error cancelling payment:", updateError);
      return NextResponse.json(
        { error: `Erreur lors de l'annulation: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 2. Suspend all tenant access (modules, users, employees)
    const disableResult = await disableTenantAccess(tenantId);

    if (!disableResult.success) {
      // Log the error but don't fail - payment is already cancelled
      console.error("Error suspending tenant:", disableResult.error);
    }

    return NextResponse.json({
      message: `Paiement annulé et accès suspendu pour ${tenant.name}`,
      paymentCancelled: true,
      accessSuspended: disableResult.success,
      modulesDisabled: disableResult.modulesDisabled,
      usersDisabled: disableResult.usersDisabled,
    });
  } catch (error) {
    console.error("POST payment cancel error:", error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
