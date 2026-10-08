/**
 * GET  /api/tenants/[tenantId]/employees/[employeeId]/payments
 * POST /api/tenants/[tenantId]/employees/[employeeId]/payments
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toNicaraguaDateString } from "@/lib/utils/formatters";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("employee_id", employeeId)
      .order("period_start", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const body = await req.json();
    const { periodStart, periodEnd, hoursWorked, hourlyRate, amount, notes, paidAt } = body;

    if (!periodStart || !periodEnd || amount === undefined) {
      return NextResponse.json(
        { error: "periodStart, periodEnd y amount son requeridos" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .insert([{
        tenant_id:    tenantId,
        employee_id:  employeeId,
        period_start: periodStart,
        period_end:   periodEnd,
        hours_worked: hoursWorked ?? 0,
        hourly_rate:  hourlyRate  ?? 0,
        amount:       amount,
        notes:        notes ?? null,
        paid_at:      paidAt ?? toNicaraguaDateString(new Date()),
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
