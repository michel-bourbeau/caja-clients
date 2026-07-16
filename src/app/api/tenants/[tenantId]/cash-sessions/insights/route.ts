import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/cash-sessions/insights
 *
 * Computes employee risk scores and top-variance products from the last 30 days.
 * Falls back to empty arrays if no sessions exist yet.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    // 30-day window
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();

    // Fetch closed sessions + counts
    const { data: sessions, error: sessErr } = await supabase
      .from("cash_sessions")
      .select(`
        id, opened_by_id, closed_by_id,
        opening_cash, closing_cash, cash_sales,
        total_sales, voids_count, no_sales_count,
        opened_at, closed_at,
        cash_session_counts(id, opening_qty, sold_qty, closing_qty, unit_price, recount_attempts),
        cash_session_employees(employee_id),
        opened_by:employees!cash_sessions_opened_by_id_fkey(id, first_name, last_name),
        closed_by:employees!cash_sessions_closed_by_id_fkey(id, first_name, last_name)
      `)
      .eq("tenant_id", tenantId)
      .eq("status", "CLOSED")
      .gte("closed_at", sinceISO)
      .order("closed_at", { ascending: false });

    if (sessErr) throw sessErr;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ riskScores: [], topVarianceProducts: [], totalSessions: 0 });
    }

    // ── Per-employee aggregation ──────────────────────────────────────────
    const empMap: Record<string, {
      id: string; firstName: string; lastName: string;
      sessions: number; recounts: number;
      negVar: number; posVar: number;
      voids: number; noSales: number;
    }> = {};

    const productVariance: Record<string, { name: string; missingQty: number; totalValue: number }> = {};

    for (const s of sessions) {
      // Determine which employee to attribute: closed_by preferred
      const empId = (s as any).closed_by_id ?? (s as any).opened_by_id;
      const empRow = (s as any).closed_by ?? (s as any).opened_by;
      if (!empId || !empRow) continue;

      if (!empMap[empId]) {
        empMap[empId] = {
          id: empId,
          firstName: empRow.first_name,
          lastName: empRow.last_name,
          sessions: 0, recounts: 0,
          negVar: 0, posVar: 0,
          voids: 0, noSales: 0,
        };
      }

      const emp = empMap[empId];
      emp.sessions++;
      emp.voids += (s as any).voids_count ?? 0;
      emp.noSales += (s as any).no_sales_count ?? 0;

      // Cash variance
      const cashExpected = ((s as any).opening_cash ?? 0) + ((s as any).cash_sales ?? 0);
      const cashActual = (s as any).closing_cash ?? 0;
      const cashVar = cashActual - cashExpected;
      if (cashVar < 0) emp.negVar += Math.abs(cashVar);
      else if (cashVar > 0) emp.posVar += cashVar;

      // Item counts
      for (const c of (s as any).cash_session_counts ?? []) {
        emp.recounts += c.recount_attempts ?? 0;
        if (c.closing_qty != null && c.opening_qty != null) {
          const expected = (c.opening_qty ?? 0) - (c.sold_qty ?? 0);
          const variance = (c.closing_qty ?? 0) - expected;
          if (variance < 0) {
            emp.negVar += Math.abs(variance) * (c.unit_price ?? 0);
            // Track product variance
            const pid = c.product_id ?? c.id;
            if (!productVariance[pid]) {
              productVariance[pid] = { name: c.product_name ?? "?", missingQty: 0, totalValue: 0 };
            }
            productVariance[pid].missingQty += Math.abs(variance);
            productVariance[pid].totalValue += Math.abs(variance) * (c.unit_price ?? 0);
          } else if (variance > 0) {
            emp.posVar += variance * (c.unit_price ?? 0);
          }
        }
      }
    }

    // ── Build risk scores ─────────────────────────────────────────────────
    const riskScores = Object.values(empMap).map((emp) => {
      const totalVar = emp.negVar + emp.posVar;
      const varianceRatio = totalVar > 0 ? emp.negVar / totalVar : 0;
      const avgRecounts = emp.sessions > 0 ? emp.recounts / emp.sessions : 0;

      // Simple scoring: weighted combination
      const score = Math.min(100, Math.round(
        varianceRatio * 40 +
        Math.min(avgRecounts * 15, 30) +
        Math.min(emp.voids * 2, 20) +
        Math.min(emp.noSales * 3, 10)
      ));

      const precision = emp.sessions > 0
        ? Math.round((1 - Math.min(emp.negVar / (emp.sessions * 1000), 1)) * 100)
        : 100;

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        riskScore: score,
        trend: "STABLE" as const,
        totalSessions: emp.sessions,
        totalRecounts: emp.recounts,
        totalNegativeVariance: Math.round(emp.negVar * 100) / 100,
        totalPositiveVariance: Math.round(emp.posVar * 100) / 100,
        varianceRatio: Math.round(varianceRatio * 1000) / 1000,
        voidsCount: emp.voids,
        noSalesCount: emp.noSales,
        precision,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    // ── Top variance products ─────────────────────────────────────────────
    const topVarianceProducts = Object.entries(productVariance)
      .map(([productId, p]) => ({ productId, name: p.name, missingQty: p.missingQty, totalValue: Math.round(p.totalValue * 100) / 100 }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return NextResponse.json({
      riskScores,
      topVarianceProducts,
      totalSessions: sessions.length,
    });
  } catch (err) {
    console.error("[cash-sessions/insights GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
