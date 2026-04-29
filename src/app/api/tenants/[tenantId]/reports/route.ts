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

    // Fetch all transactions in the date range using pagination
    // (Supabase/PostgREST defaults to 1000 rows max per request)
    const PAGE_SIZE = 1000;
    let allTransactions: any[] = [];
    let rangeFrom = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["COMPLETED", "REFUND"])
        .gte("created_at", utcFromDate)
        .lt("created_at", utcToDate)
        .order("created_at", { ascending: true })
        .range(rangeFrom, rangeFrom + PAGE_SIZE - 1);

      if (error) throw error;

      allTransactions = allTransactions.concat(data || []);

      if (!data || data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        rangeFrom += PAGE_SIZE;
      }
    }

    const txns = allTransactions;

    if (reportType === "SUMMARY") {
      return NextResponse.json(generateSummarySales(txns, utcFromDate, utcToDate));
    } else if (reportType === "PRODUCT") {
      return NextResponse.json(generateProductReport(txns));
    } else if (reportType === "PAYMENT") {
      return NextResponse.json(generatePaymentReport(txns));
    } else if (reportType === "BILAN") {
      return NextResponse.json(generateBilanReport(txns));
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
  const hourSales = new Map<number, number>();

  // Track unique timestamps per day and per hour (same second = same client)
  const dailyUniqueTs = new Map<string, Set<string>>();
  const hourUniqueTs = new Map<number, Set<string>>();

  txns.forEach((tx) => {
    const isRefund = tx.status === "REFUND";
    const date = new Date(tx.created_at);
    // Convert UTC → Nicaragua local time (UTC-6) for display
    const localDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
    const dateStr = localDate.toISOString().split("T")[0];
    const hour = localDate.getUTCHours();
    // Key to the second — same second = same client (handles imported data)
    const tsKey = tx.created_at.substring(0, 19);

    totalSales += Number(tx.total);   // negative for refunds → auto-subtracted
    totalDiscount += Number(tx.discount || 0);
    totalTax += Number(tx.tax || 0);

    // Don't count refunds as separate client visits for hourly traffic
    if (!isRefund) {
      if (!hourUniqueTs.has(hour)) hourUniqueTs.set(hour, new Set());
      hourUniqueTs.get(hour)!.add(tsKey);
      hourSales.set(hour, (hourSales.get(hour) || 0) + Number(tx.total));
      const hourClientCount = hourUniqueTs.get(hour)!.size;
      if (hourClientCount > bestHour.count) {
        bestHour = { hour, count: hourClientCount };
      }
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
      dailyUniqueTs.set(dateStr, new Set());
    }

    const daily = dailyMap.get(dateStr)!;
    daily.sales += Number(tx.total);   // negative for refunds → auto-subtracted
    daily.discount += Number(tx.discount || 0);
    daily.tax += Number(tx.tax || 0);
    // Only count non-refund transactions as unique visits
    if (!isRefund) dailyUniqueTs.get(dateStr)!.add(tsKey);
    daily.transactions = dailyUniqueTs.get(dateStr)!.size;
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
      transactions: hourUniqueTs.get(hour)?.size || 0,
    });
  }

  // Total unique client timestamps across all days (exclude refunds)
  const allUniqueTs = new Set<string>();
  txns.forEach((tx) => {
    if (tx.status !== "REFUND") allUniqueTs.add(tx.created_at.substring(0, 19));
  });
  const totalClients = allUniqueTs.size;

  return {
    summary: {
      totalSales,
      totalDiscount,
      totalTax,
      totalTransactions: totalClients,
      averageTransaction: totalClients > 0 ? totalSales / totalClients : 0,
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
 * 
 * For imported data with missing productId:
 * - Use product name as key if productId is null
 * - This ensures products with same name are grouped together
 * 
 * For imported data with missing prices:
 * - Use quantity * price if price is available
 * - If price is 0 or missing, calculate proportionally from transaction total
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
    
    // Calculate total quantity in transaction for proportion-based revenue calculation
    const totalQtyInTx = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const txSubtotal = Number(tx.subtotal) || 0;
    
    items.forEach((item: any) => {
      const itemQty = item.quantity || 0;
      
      // Skip items with zero quantity
      if (itemQty === 0) {
        return;
      }
      
      // Use productId if available, otherwise use product name as key
      const itemName = item.name && item.name.trim() ? item.name.trim() : "Unknown Product";
      const key = item.productId && item.productId.trim() ? item.productId : itemName;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: item.productId || itemName,
          name: itemName,
          quantity: 0,
          revenue: 0,
          count: 0,
        });
      }
      
      const prod = productMap.get(key)!;
      prod.quantity += itemQty;
      
      // Calculate revenue: prefer direct price, fallback to proportion-based calculation
      let itemRevenue = 0;
      const itemPrice = Number(item.price) || 0;
      
      if (itemPrice > 0) {
        // Price is available - use direct calculation
        itemRevenue = itemQty * itemPrice;
      } else if (totalQtyInTx > 0 && txSubtotal > 0) {
        // Price missing - calculate proportionally from transaction subtotal
        itemRevenue = (itemQty / totalQtyInTx) * txSubtotal;
      }
      
      prod.revenue += itemRevenue;
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

/**
 * Generate bilan (financial overview) aggregated data.
 * Computes revenue, COGS, gross profit and transaction count from items.
 */
function generateBilanReport(txns: any[]) {
  let revenue = 0;
  let cogs = 0;
  let refundTotal = 0;
  let refundCount = 0;

  // Unique client timestamps (same second = same client)
  const uniqueTs = new Set<string>();

  txns.forEach((tx) => {
    const isRefund = tx.status === "REFUND";
    if (!isRefund) uniqueTs.add((tx.created_at as string).substring(0, 19));
    if (isRefund) {
      refundTotal += Math.abs(Number(tx.total));
      refundCount += 1;
    }
    const items: any[] = tx.items || [];
    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      revenue += (Number(item.price) || 0) * qty;   // negative for refund items
      cogs    += (Number(item.cost_price) || 0) * qty;
    });
  });

  const txCount = uniqueTs.size;
  const grossProfit = revenue - cogs;

  return { revenue, cogs, grossProfit, txCount, refundTotal, refundCount };
}
