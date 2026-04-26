import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/reports?type=SUMMARY|PRODUCT|PAYMENT&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * 
 * Returns aggregated sales data for the requested report type.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "SUMMARY";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "fromDate and toDate are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Nicaragua is UTC-6. Convert local dates to UTC range.
    // "fromDate 00:00 Nicaragua" = fromDate + "T06:00:00Z" (UTC)
    // "toDate 23:59:59 Nicaragua" = toDate + "T05:59:59Z" next day (UTC)
    const utcFromDate = `${fromDate}T06:00:00Z`;
    const nextDay = new Date(`${toDate}T06:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const utcToDate = nextDay.toISOString();

    // Fetch all transactions in the date range
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "COMPLETED")
      .gte("created_at", utcFromDate)
      .lt("created_at", utcToDate)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const txns = transactions || [];

    if (reportType === "SUMMARY") {
      return NextResponse.json(generateSummarySales(txns, utcFromDate, utcToDate));
    } else if (reportType === "PRODUCT") {
      return NextResponse.json(generateProductReport(txns));
    } else if (reportType === "PAYMENT") {
      return NextResponse.json(generatePaymentReport(txns));
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Generate summary sales data: daily totals, transaction count, payment breakdown.
 */
function generateSummarySales(
  txns: any[],
  utcFromDate: string,
  utcToDate: string
) {
  const dailyMap = new Map<string, {
    date: string;
    sales: number;
    discount: number;
    tax: number;
    transactions: number;
    payment: Record<string, number>;
  }>();

  let totalSales = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let bestHour = { hour: 0, count: 0 };
  const hourCounts = new Map<number, number>();
  const hourSales = new Map<number, number>();

  txns.forEach((tx) => {
    const date = new Date(tx.created_at);
    const localDate = new Date(date.getTime() + 6 * 60 * 60 * 1000); // UTC-6 for Nicaragua
    const dateStr = localDate.toISOString().split("T")[0];
    const hour = localDate.getUTCHours();

    totalSales += Number(tx.total);
    totalDiscount += Number(tx.discount || 0);
    totalTax += Number(tx.tax || 0);

    // Track hourly distribution
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    hourSales.set(hour, (hourSales.get(hour) || 0) + Number(tx.total));
    if ((hourCounts.get(hour) || 0) > bestHour.count) {
      bestHour = { hour, count: hourCounts.get(hour)! };
    }

    // Aggregate by date
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, {
        date: dateStr,
        sales: 0,
        discount: 0,
        tax: 0,
        transactions: 0,
        payment: {},
      });
    }

    const daily = dailyMap.get(dateStr)!;
    daily.sales += Number(tx.total);
    daily.discount += Number(tx.discount || 0);
    daily.tax += Number(tx.tax || 0);
    daily.transactions += 1;
    daily.payment[tx.payment_method] = (daily.payment[tx.payment_method] || 0) + Number(tx.total);
  });

  const byDay = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Build hourly data (0-23)
  const byHour = [];
  for (let hour = 0; hour < 24; hour++) {
    byHour.push({
      hour,
      sales: hourSales.get(hour) || 0,
      transactions: hourCounts.get(hour) || 0,
    });
  }

  return {
    summary: {
      totalSales,
      totalDiscount,
      totalTax,
      totalTransactions: txns.length,
      averageTransaction: txns.length > 0 ? totalSales / txns.length : 0,
      bestHour: bestHour.hour,
      bestHourCount: bestHour.count,
    },
    byDay,
    byHour,
  };
}

/**
 * Generate top 10 products by quantity and revenue.
 * 
 * Fix for multi-formato: Always keep the best available name
 * - Prefer non-empty names from items
 * - For items without names, use productId as fallback
 */
function generateProductReport(txns: any[]) {
  const productMap = new Map<string, {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    count: number; // number of transactions this product appeared in
  }>();

  txns.forEach((tx) => {
    const items = tx.items || [];
    items.forEach((item: any) => {
      const key = item.productId;
      const itemName = item.name && item.name.trim() ? item.name.trim() : `Producto ${key}`;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: key,
          name: itemName,
          quantity: 0,
          revenue: 0,
          count: 0,
        });
      }
      
      const prod = productMap.get(key)!;
      
      // Update name if current one is a fallback and new one is not
      if (prod.name.startsWith("Producto ") && !itemName.startsWith("Producto ")) {
        prod.name = itemName;
      }
      
      prod.quantity += item.quantity || 0;
      prod.revenue += (item.quantity || 0) * (Number(item.price) || 0);
      prod.count += 1;
    });
  });

  const topByRevenue = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topByQuantity = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { topByRevenue, topByQuantity };
}

/**
 * Generate payment method breakdown.
 */
function generatePaymentReport(txns: any[]) {
  const paymentMap: Record<string, { method: string; amount: number; count: number }> = {};

  txns.forEach((tx) => {
    const method = tx.payment_method || "UNKNOWN";
    if (!paymentMap[method]) {
      paymentMap[method] = { method, amount: 0, count: 0 };
    }
    paymentMap[method].amount += Number(tx.total);
    paymentMap[method].count += 1;
  });

  const breakdown = Object.values(paymentMap).sort((a, b) => b.amount - a.amount);

  return { breakdown };
}
