import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/payment
 * Get payment info and history for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get tenant with payment info
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, plan, paid_until")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenants) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Get payment history
    const { data: history, error: historyError } = await supabase
      .from("payment_history")
      .select(
        "id, plan, amount, paid_until, payment_date, payment_method, notes"
      )
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false })
      .limit(10);

    if (historyError) {
      console.error("Payment history error:", historyError);
      return NextResponse.json(
        { error: "Error fetching payment history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan: tenants.plan,
      paid_until: tenants.paid_until,
      history: history || [],
    });
  } catch (error) {
    console.error("GET payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
