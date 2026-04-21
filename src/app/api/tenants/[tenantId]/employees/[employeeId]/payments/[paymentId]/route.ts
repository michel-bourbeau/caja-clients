/**
 * DELETE /api/tenants/[tenantId]/employees/[employeeId]/payments/[paymentId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string; paymentId: string }> }
) {
  try {
    const { tenantId, employeeId, paymentId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("salary_payments")
      .delete()
      .eq("id", paymentId)
      .eq("employee_id", employeeId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
