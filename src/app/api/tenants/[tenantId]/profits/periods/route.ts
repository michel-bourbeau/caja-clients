import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface PeriodData {
  period: string;
  revenue: number;
  cogs: number;
  profit: number;
  count: number;
}

/**
 * GET /api/tenants/[tenantId]/profits/periods
 * Returns profit data grouped by period (day, week, month, year)
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
    const groupBy = url.searchParams.get("groupBy") || "day"; // day, week, month, year

    // Get all transactions for the date range
    let query = supabaseAdmin
      .from("transactions")
      .select("id, items, created_at, status, payment_method")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    // Apply date filters if provided
    // Same logic as /api/tenants/[tenantId]/transactions
    if (from && to) {
      query = query
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Aggregate data by period
    const periodStats: Record<string, PeriodData> = {};

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx: any) => {
        // Convert UTC to Nicaragua time (UTC-6)
        const utcDate = new Date(tx.created_at);
        // Subtract 6h to get Nicaragua time, then use UTC methods to extract date parts
        // (avoids server local timezone affecting the result)
        const nicaraguaDate = new Date(utcDate.getTime() - 6 * 60 * 60 * 1000);
        
        let periodKey: string;

        switch (groupBy) {
          case "week": {
            const start = new Date(Date.UTC(nicaraguaDate.getUTCFullYear(), 0, 1));
            const diff = nicaraguaDate.getTime() - start.getTime();
            const oneDay = 86400000;
            const weekNumber = Math.floor(diff / oneDay / 7) + 1;
            periodKey = `${nicaraguaDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
            break;
          }
          case "month": {
            periodKey = `${nicaraguaDate.getUTCFullYear()}-${String(nicaraguaDate.getUTCMonth() + 1).padStart(2, "0")}`;
            break;
          }
          case "year": {
            periodKey = `${nicaraguaDate.getUTCFullYear()}`;
            break;
          }
          case "day":
          default: {
            const year = nicaraguaDate.getUTCFullYear();
            const month = String(nicaraguaDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(nicaraguaDate.getUTCDate()).padStart(2, '0');
            periodKey = `${year}-${month}-${day}`;
            break;
          }
        }

        if (!periodStats[periodKey]) {
          periodStats[periodKey] = {
            period: periodKey,
            revenue: 0,
            cogs: 0,
            profit: 0,
            count: 0,
          };
        }

        // Calculate revenue and COGS from items (JSONB)
        let txRevenue = 0;
        let txCOGS = 0;

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

        periodStats[periodKey].revenue += txRevenue;
        periodStats[periodKey].cogs += txCOGS;
        periodStats[periodKey].profit += txProfit;
        periodStats[periodKey].count += 1;
      });
    }

    // Convert to array and round values
    const result = Object.values(periodStats)
      .map((stat) => ({
        ...stat,
        revenue: Math.round(stat.revenue * 100) / 100,
        cogs: Math.round(stat.cogs * 100) / 100,
        profit: Math.round(stat.profit * 100) / 100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /profits/periods] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
