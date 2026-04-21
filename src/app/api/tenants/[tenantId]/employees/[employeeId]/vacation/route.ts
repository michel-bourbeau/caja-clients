import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/employees/[employeeId]/vacation
 * Returns vacation accrual calculation and payment history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const supabase = getSupabaseAdmin();

    // Get employee and salary payments
    const [{ data: employee }, { data: salaryPayments }, { data: vacationPayments }] = await Promise.all([
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
        .from("vacation_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: false }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const today = new Date();
    const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
    const monthsSinceHire = hireDate ? (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;

    // Vacation accrual: 2.5 days per month
    const daysAccrued = Math.round(monthsSinceHire * 2.5 * 10) / 10;

    // Calculate days used from vacation_payments
    const daysUsed = (vacationPayments || []).reduce((sum, vp) => sum + (vp.days_used || 0), 0);
    const daysRemaining = Math.max(0, daysAccrued - daysUsed);

    // Calculate average monthly salary from actual salary payments
    // Sum all real earnings and divide by months since hire date
    let totalEarnings = 0;
    if (salaryPayments && salaryPayments.length > 0) {
      salaryPayments.forEach((sp) => {
        const earnings = (sp.hours_worked || 0) * (sp.hourly_rate || 0);
        totalEarnings += earnings;
      });
    }

    // Average monthly salary = total earnings / months worked since hire
    const avgMonthlySalary = monthsSinceHire > 0 ? totalEarnings / monthsSinceHire : 0;

    // Monetary value of remaining vacation days
    // Assuming 20 working days per month
    const dailyRate = avgMonthlySalary / 20;
    const monetaryValue = Math.round(daysRemaining * dailyRate * 100) / 100;

    return NextResponse.json({
      hireDate: employee.hire_date,
      monthsSinceHire,
      daysAccrued,
      daysUsed,
      daysRemaining,
      avgMonthlySalary,
      dailyRate,
      monetaryValue,
      history: vacationPayments || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/employees/[employeeId]/vacation
 * Record a vacation payment.
 * Body: { daysUsed, startDate, endDate, monetaryValue, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const { daysUsed, startDate, endDate, monetaryValue, notes } = await request.json();

    if (!daysUsed || !startDate || !endDate || !monetaryValue) {
      return NextResponse.json(
        { error: "Missing required fields: daysUsed, startDate, endDate, monetaryValue" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("vacation_payments")
      .insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        days_used: daysUsed,
        start_date: startDate,
        end_date: endDate,
        monetary_value: monetaryValue,
        notes,
        approved_at: new Date().toISOString(),
      })
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
