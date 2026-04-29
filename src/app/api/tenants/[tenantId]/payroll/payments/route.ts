/**
 * GET /api/tenants/[tenantId]/payroll/payments
 *
 * Two modes:
 *   1. ?from=YYYY-MM-DD&to=YYYY-MM-DD  (period mode – existing behavior)
 *      Returns payments where period_start = from AND period_end = to.
 *
 *   2. ?paidFrom=YYYY-MM-DD&paidTo=YYYY-MM-DD  (date-range mode)
 *      Returns payments where paid_at is between paidFrom and paidTo.
 *      Includes employee first_name + last_name via join.
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
    const from      = searchParams.get("from");
    const to        = searchParams.get("to");
    const paidFrom  = searchParams.get("paidFrom");
    const paidTo    = searchParams.get("paidTo");

    const supabase = getSupabaseAdmin();

    if (paidFrom && paidTo) {
      // Date-range mode: filter by paid_at, join employee name
      const { data, error } = await supabase
        .from("salary_payments")
        .select("id, employee_id, period_start, period_end, hours_worked, hourly_rate, amount, notes, paid_at, employees(first_name, last_name)")
        .eq("tenant_id", tenantId)
        .gte("paid_at", paidFrom)
        .lte("paid_at", paidTo)
        .order("paid_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // Period mode (original behavior)
    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

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
