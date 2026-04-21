/**
 * GET /api/tenants/[tenantId]/payroll/payments?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns all salary_payments for the tenant where period_start = from AND period_end = to.
 * Used by the payroll overview to show which employees have been paid for a given period.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .select("id, employee_id, period_start, period_end, hours_worked, hourly_rate, amount, notes, paid_at")
      .eq("tenant_id", tenantId)
      .eq("period_start", from)
      .eq("period_end", to)
      .order("paid_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
