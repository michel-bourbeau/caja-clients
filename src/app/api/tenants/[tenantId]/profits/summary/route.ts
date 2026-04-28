import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/profits/summary
 * Returns profit summary data for a given date range
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    // Get optional date filters from query params
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Build base query for transactions - include items JSONB
    let query = supabaseAdmin
      .from("transactions")
      .select("id, items, payment_method, status, created_at")
      .eq("tenant_id", tenantId);

    // Apply date filters if provided
    // Same logic as /api/tenants/[tenantId]/transactions
    if (from && to) {
      query = query
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions?.length || 0,
      totalRevenue: 0,
      totalCOGS: 0,
      totalProfit: 0,
      avgProfit: 0,
      avgMargin: 0,
      profitByPaymentMethod: {} as Record<string, { revenue: number; cogs: number; profit: number; count: number }>,
    };

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx: any) => {
        let txRevenue = 0;
        let txCOGS = 0;

        // Calculate from items if available
        const items = tx.items || [];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const itemPrice = item.price || 0;
            const quantity = item.quantity || 1;
            const costPrice = item.cost_price || 0;

            txRevenue += itemPrice * quantity;
            txCOGS += costPrice * quantity;
          });
        }

        const txProfit = txRevenue - txCOGS;

        summary.totalRevenue += txRevenue;
        summary.totalCOGS += txCOGS;
        summary.totalProfit += txProfit;

        // Group by payment method
        const method = tx.payment_method || "UNKNOWN";
        if (!summary.profitByPaymentMethod[method]) {
          summary.profitByPaymentMethod[method] = { revenue: 0, cogs: 0, profit: 0, count: 0 };
        }
        summary.profitByPaymentMethod[method].revenue += txRevenue;
        summary.profitByPaymentMethod[method].cogs += txCOGS;
        summary.profitByPaymentMethod[method].profit += txProfit;
        summary.profitByPaymentMethod[method].count += 1;
      });

      summary.avgProfit = summary.totalProfit / summary.totalTransactions;
      summary.avgMargin = summary.totalRevenue > 0 ? (summary.totalProfit / summary.totalRevenue) * 100 : 0;
    }

    // Round to 2 decimal places
    summary.totalRevenue = Math.round(summary.totalRevenue * 100) / 100;
    summary.totalCOGS = Math.round(summary.totalCOGS * 100) / 100;
    summary.totalProfit = Math.round(summary.totalProfit * 100) / 100;
    summary.avgProfit = Math.round(summary.avgProfit * 100) / 100;
    summary.avgMargin = Math.round(summary.avgMargin * 100) / 100;

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /profits/summary] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
