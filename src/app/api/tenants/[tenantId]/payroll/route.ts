/**
 * GET /api/tenants/[tenantId]/payroll
 *
 * Returns:
 *   - `config`   — payroll configuration (frequency, weekStartDay, monthStartDay)
 *   - `periods`  — list of recent pay periods (last 12)
 *   - `summary`  — if ?from=YYYY-MM-DD&to=YYYY-MM-DD is provided, returns each
 *                  active employee's hours worked and salary owed for that period
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PayrollConfig, PeriodInfo } from "@/lib/types";

// ─── Date helpers (Nicaragua = UTC-6, no DST) ─────────────────────────────────

function toNicaraguaDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua" }).format(d);
}

/** Add `days` days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Day-of-week in Nicaragua time (0=Sun … 6=Sat) */
function nicaraguaDow(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Days in a month */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Period generation ────────────────────────────────────────────────────────

function generatePeriods(config: PayrollConfig, count = 12): PeriodInfo[] {
  const today = toNicaraguaDateString(new Date());
  const periods: PeriodInfo[] = [];

  if (config.frequency === "weekly" || config.frequency === "biweekly") {
    const span = config.frequency === "weekly" ? 7 : 14;
    const dow = nicaraguaDow(today);
    const startDow = config.weekStartDay; // e.g. 1 = Monday
    const daysBack = (dow - startDow + 7) % 7;
    // Start of the current period
    let currentStart = addDays(today, -daysBack);

    for (let i = 0; i < count; i++) {
      const start = addDays(currentStart, -span * i);
      const end   = addDays(start, span - 1);
      periods.push({
        id: start,
        startDate: start,
        endDate: end,
        label: formatPeriodLabel(start, end),
        isCurrent: i === 0,
      });
    }
  } else {
    // Monthly
    const [ty, tm] = today.split("-").map(Number);
    const startDay = Math.min(config.monthStartDay, 28);

    for (let i = 0; i < count; i++) {
      let sYear = ty, sMonth = tm - i;
      while (sMonth <= 0) { sMonth += 12; sYear--; }

      const startDate = `${String(sYear).padStart(4, "0")}-${String(sMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;

      let eYear = sYear, eMonth = sMonth;
      if (startDay === 1) {
        // end = last day of same month
        const lastDay = daysInMonth(eYear, eMonth);
        const endDate = `${String(eYear).padStart(4, "0")}-${String(eMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const isCurrent = startDate <= today && today <= endDate;
        periods.push({ id: startDate, startDate, endDate, label: formatPeriodLabel(startDate, endDate), isCurrent });
      } else {
        // end = day before startDay of next month
        let nYear = sYear, nMonth = sMonth + 1;
        if (nMonth > 12) { nMonth = 1; nYear++; }
        const endDate = addDays(`${String(nYear).padStart(4, "0")}-${String(nMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`, -1);
        const isCurrent = startDate <= today && today <= endDate;
        periods.push({ id: startDate, startDate, endDate, label: formatPeriodLabel(startDate, endDate), isCurrent });
      }
    }
  }

  return periods;
}

function formatPeriodLabel(start: string, end: string): string {
  const fmt = (d: string) => {
    const [, m, dd] = d.split("-");
    const months = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${parseInt(dd)} ${months[parseInt(m)]}`;
  };
  const [ey] = end.split("-");
  return `${fmt(start)} – ${fmt(end)} ${ey}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate   = searchParams.get("to");

    const supabase = getSupabaseAdmin();

    // Load payroll config from tenant_settings
    const { data: settingsRow } = await supabase
      .from("tenant_settings")
      .select("payroll_config")
      .eq("tenant_id", tenantId)
      .single();

    const DEFAULT_CONFIG: PayrollConfig = { frequency: "weekly", weekStartDay: 1, monthStartDay: 1 };
    const config: PayrollConfig = (settingsRow?.payroll_config as PayrollConfig) ?? DEFAULT_CONFIG;

    const periods = generatePeriods(config);

    // If no date range requested, just return config + periods
    if (!fromDate || !toDate) {
      return NextResponse.json({ config, periods });
    }

    // ── Build period summary ──────────────────────────────────────────────────
    // Convert Nicaragua dates to UTC boundaries for querying time_entries
    const fromUTC = new Date(`${fromDate}T00:00:00-06:00`).toISOString();
    const toUTC   = new Date(`${toDate}T23:59:59-06:00`).toISOString();

    const [empRes, entRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, first_name, last_name, salary, status")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .order("first_name"),
      supabase
        .from("time_entries")
        .select("employee_id, check_in, check_out")
        .eq("tenant_id", tenantId)
        .gte("check_in", fromUTC)
        .lte("check_in", toUTC),
    ]);

    if (empRes.error) throw empRes.error;
    if (entRes.error) throw entRes.error;

    const employees: { id: string; first_name: string; last_name: string; salary: number }[] = empRes.data ?? [];
    const entries: { employee_id: string; check_in: string; check_out: string | null }[] = entRes.data ?? [];

    const summary = employees.map((emp) => {
      const empEntries = entries.filter((e) => e.employee_id === emp.id);
      let totalMinutes = 0;
      for (const e of empEntries) {
        if (e.check_out) {
          const diff = new Date(e.check_out).getTime() - new Date(e.check_in).getTime();
          totalMinutes += Math.max(0, Math.floor(diff / 60000));
        }
      }
      const hoursWorked = Math.round((totalMinutes / 60) * 100) / 100;
      const hourlyRate  = emp.salary ?? 0;   // salary column stores the hourly rate
      const salaryDue   = Math.round(hoursWorked * hourlyRate * 100) / 100;
      const shiftsCount = empEntries.length;

      return {
        employeeId:   emp.id,
        firstName:    emp.first_name,
        lastName:     emp.last_name,
        hourlyRate,
        hoursWorked,
        shiftsCount,
        salaryDue,
        hasOpenShift: empEntries.some((e) => !e.check_out),
      };
    });

    return NextResponse.json({ config, periods, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
