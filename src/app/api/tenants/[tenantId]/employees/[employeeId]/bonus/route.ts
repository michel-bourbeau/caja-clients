import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/employees/[employeeId]/bonus
 * Returns bonus (aguinaldo) calculation and payment history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const supabase = getSupabaseAdmin();

    // Get employee and salary payments
    const [{ data: employee }, { data: salaryPayments }, { data: bonusPayments }] = await Promise.all([
      supabase
        .from("employees")
        .select("id, hire_date, salary, salary_type")
        .eq("tenant_id", tenantId)
        .eq("id", employeeId)
        .single(),
      supabase
        .from("salary_payments")
        .select("hours_worked, hourly_rate, period_start, period_end")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .order("period_end", { ascending: false }),
      supabase
        .from("bonus_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .order("cycle_year", { ascending: false }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Calculate aguinaldo for current cycle (Dec-Nov)
    const today = new Date();
    let cycleYear = today.getMonth() >= 11 ? today.getFullYear() + 1 : today.getFullYear();
    const cycleStart = new Date(cycleYear - 1, 11, 1); // Dec 1 of previous year
    const cycleEnd = new Date(cycleYear, 10, 30); // Nov 30 of current year

    const monthsInCycle = (cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
    const monthsSinceHire = hireDate ? (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;

    const monthsWorkedInCycle = Math.min(monthsSinceHire, monthsInCycle);

    // Calculate average monthly salary from actual salary payments
    // Sum all real earnings and divide by actual months worked in cycle
    let totalEarnings = 0;
    if (salaryPayments && salaryPayments.length > 0) {
      salaryPayments.forEach((sp) => {
        const earnings = (sp.hours_worked || 0) * (sp.hourly_rate || 0);
        totalEarnings += earnings;
      });
    }

    // Average monthly salary = total earnings / actual months worked (not payment records)
    const avgMonthlySalary = monthsWorkedInCycle > 0 ? totalEarnings / monthsWorkedInCycle : 0;

    const calculatedBonus = Math.round(avgMonthlySalary * (monthsWorkedInCycle / 12) * 100) / 100;

    // Check if already paid this year
    const alreadyPaid = bonusPayments?.find((b) => b.cycle_year === cycleYear && b.paid_at);

    return NextResponse.json({
      cycleStart: cycleStart.toISOString().split("T")[0],
      cycleEnd: cycleEnd.toISOString().split("T")[0],
      cycleYear,
      monthsWorkedInCycle,
      avgMonthlySalary,
      calculatedBonus,
      alreadyPaid: !!alreadyPaid,
      history: bonusPayments || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/employees/[employeeId]/bonus
 * Record a bonus (aguinaldo) payment.
 * Body: { cycleYear, paidAmount, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const { cycleYear, paidAmount, notes } = await request.json();

    const supabase = getSupabaseAdmin();

    // First, check if employee exists and get calculated amount
    const { data: bonusData } = await supabase.rpc("get_employee_bonus", {
      p_tenant_id: tenantId,
      p_employee_id: employeeId,
      p_cycle_year: cycleYear,
    });

    const calculatedAmount = bonusData?.[0]?.calculated_bonus || 0;

    // Upsert bonus payment record
    const { data, error } = await supabase
      .from("bonus_payments")
      .upsert(
        {
          tenant_id: tenantId,
          employee_id: employeeId,
          cycle_year: cycleYear,
          calculated_amount: calculatedAmount,
          paid_amount: paidAmount,
          paid_at: new Date().toISOString(),
          notes,
        },
        { onConflict: "tenant_id,employee_id,cycle_year" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
