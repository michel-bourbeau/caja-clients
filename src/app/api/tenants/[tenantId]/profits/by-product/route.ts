import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/profits/by-product
 * Returns profit data grouped by product
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

    // Get all transactions for the date range
    let query = supabaseAdmin
      .from("transactions")
      .select("id, items, created_at, status")
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

    // Aggregate data by product
    const productStats: Record<
      string,
      {
        productId: string;
        name: string;
        quantity: number;
        totalRevenue: number;
        totalCOGS: number;
        totalProfit: number;
        avgMargin: number;
      }
    > = {};

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx: any) => {
        const items = tx.items || [];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const productId = item.productId || item.product_id || "UNKNOWN";
            const name = item.name || "Unnamed Product";
            const quantity = item.quantity || 0;
            const itemPrice = item.price || 0;
            const itemRevenue = itemPrice * quantity;
            const itemCost = (item.cost_price || 0) * quantity;
            const itemProfit = itemRevenue - itemCost;

            if (!productStats[productId]) {
              productStats[productId] = {
                productId,
                name,
                quantity: 0,
                totalRevenue: 0,
                totalCOGS: 0,
                totalProfit: 0,
                avgMargin: 0,
              };
            }

            productStats[productId].quantity += quantity;
            productStats[productId].totalRevenue += itemRevenue;
            productStats[productId].totalCOGS += itemCost;
            productStats[productId].totalProfit += itemProfit;
          });
        }
      });
    }

    // Calculate margins and convert to array
    const result = Object.values(productStats)
      .map((stat) => {
        stat.totalRevenue = Math.round(stat.totalRevenue * 100) / 100;
        stat.totalCOGS = Math.round(stat.totalCOGS * 100) / 100;
        stat.totalProfit = Math.round(stat.totalProfit * 100) / 100;
        stat.avgMargin = stat.totalRevenue > 0 ? (stat.totalProfit / stat.totalRevenue) * 100 : 0;
        stat.avgMargin = Math.round(stat.avgMargin * 100) / 100;
        return stat;
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /profits/by-product] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
