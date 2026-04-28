import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkPlanStatus, respondWithExpiredPlan } from "@/lib/utils/planStatusCheck";
import { CartItem, Transaction } from "@/lib/types";

interface Tax {
  name: string;
  rate: number;
  is_active: boolean;
}

interface TaxBreakdown {
  name: string;
  rate: number;
  amount: number;
}

function calculateTotals(items: CartItem[], taxes: Tax[] = [], discount: number = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  // Apply discount
  const discountAmount = Math.min(discount, subtotal);
  const subtotalAfterDiscount = subtotal - discountAmount;
  
  // Calculate each tax separately
  const activeTaxes = taxes.filter((t) => t.is_active);
  const taxBreakdown: TaxBreakdown[] = [];
  let totalTax = 0;
  
  if (activeTaxes.length > 0) {
    activeTaxes.forEach((tax) => {
      const amount = Math.round(subtotalAfterDiscount * (tax.rate / 100) * 100) / 100;
      taxBreakdown.push({
        name: tax.name,
        rate: tax.rate,
        amount,
      });
      totalTax += amount;
    });
  }
  
  totalTax = Math.round(totalTax * 100) / 100;
  const total = Math.round((subtotalAfterDiscount + totalTax) * 100) / 100;
  
  return { 
    subtotal, 
    discount: discountAmount, 
    subtotalAfterDiscount, 
    tax: totalTax,
    taxBreakdown,
    total 
  };
}

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

    let query = supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId);

    // Apply date filters if provided
    if (from && to) {
      query = query
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("[GET /transactions] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    // Check if plan is valid (not expired more than 3 days)
    const planStatus = await checkPlanStatus(tenantId);
    if (!planStatus.isValid) {
      return respondWithExpiredPlan();
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();

    const items: CartItem[] = body.items;
    const paymentMethod: Transaction["paymentMethod"] = body.paymentMethod;
    const cashierId: string = body.cashierId || "unknown";
    const cashierName: string = body.cashierName || "Unknown";
    const discount: number = Math.max(0, body.discount || 0);
    const amountReceived: number = body.amountReceived || 0;
    const currencyPaid: string = body.currency_paid || "NIO";
    const usdAmountReceived: number = body.usd_amount_received || 0;
    const usdExchangeRate: number = body.usd_exchange_rate || 37.00;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Aucun article dans le panier" }, { status: 400 });
    }

    // Separate variant items from regular items
    const variantItems = items.filter((i) => i.variantId);
    const regularItems = items.filter((i) => !i.variantId);

    // Fetch regular products stock
    const productIds = regularItems.map((item) => item.productId);
    const productMap = new Map<string, any>();

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabaseAdmin
        .from("products")
        .select("id, stock_quantity, price, cost_price")
        .in("id", productIds)
        .eq("tenant_id", tenantId);

      if (productsError) throw productsError;
      if (!products || products.length !== productIds.length) {
        return NextResponse.json({ error: "Certains produits sont introuvables" }, { status: 400 });
      }
      products.forEach((p: any) => productMap.set(p.id, p));
    }

    // Fetch variant stock
    const variantIds = variantItems.map((i) => i.variantId!);
    const variantMap = new Map<string, any>();

    if (variantIds.length > 0) {
      const { data: variants, error: variantsError } = await supabaseAdmin
        .from("product_variants")
        .select("id, product_id, stock_quantity, price, cost_price")
        .in("id", variantIds)
        .eq("tenant_id", tenantId);

      if (variantsError) throw variantsError;
      if (!variants || variants.length !== variantIds.length) {
        return NextResponse.json({ error: "Certains formats sont introuvables" }, { status: 400 });
      }
      variants.forEach((v: any) => variantMap.set(v.id, v));
    }

    // Validate stock for all items
    for (const item of items) {
      if (item.quantity <= 0) {
        return NextResponse.json({ error: "La quantité doit être supérieure à 0" }, { status: 400 });
      }
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          return NextResponse.json({ error: `Format introuvable: ${item.variantId}` }, { status: 400 });
        }
        if (item.quantity > variant.stock_quantity) {
          return NextResponse.json({ error: `Stock insuffisant pour le format ${item.variantId}` }, { status: 400 });
        }
      } else {
        const product = productMap.get(item.productId);
        if (!product) {
          return NextResponse.json({ error: `Produit introuvable: ${item.productId}` }, { status: 400 });
        }
        if (item.quantity > product.stock_quantity) {
          return NextResponse.json({ error: `Stock insuffisant pour ${item.productId}` }, { status: 400 });
        }
      }
    }

    // Fetch configured taxes for this tenant
    const { data: taxesData, error: taxesError } = await supabaseAdmin
      .from("tenant_taxes")
      .select("*")
      .eq("tenant_id", tenantId);

    if (taxesError) {
      console.error("[transactions POST] Taxes fetch error:", taxesError);
    }

    const configuredTaxes: Tax[] = taxesData || [];
    const transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { subtotal, discount: discountAmount, subtotalAfterDiscount, tax, taxBreakdown, total } = calculateTotals(items, configuredTaxes, discount);
    const change = paymentMethod === "CASH" ? amountReceived - total : 0;

    // Calculate cost of goods sold (COGS) and profit
    let costOfGoodsSold = 0;
    const itemsWithCost: CartItem[] = items.map((item) => {
      let cost_price = 0;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        cost_price = variant?.cost_price || 0;
      } else {
        const product = productMap.get(item.productId);
        cost_price = product?.cost_price || 0;
      }
      costOfGoodsSold += cost_price * item.quantity;
      return { ...item, cost_price };
    });

    // Calculate profit (total - COGS)
    const profitAmount = total - costOfGoodsSold;

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          id: transactionId,
          tenant_id: tenantId,
          cashier_id: cashierId,
          cashier_name: cashierName,
          items: itemsWithCost,
          subtotal,
          discount: discountAmount,
          tax,
          tax_breakdown: taxBreakdown,
          total,
          cost_of_goods_sold: Math.round(costOfGoodsSold * 100) / 100,
          profit: Math.round(profitAmount * 100) / 100,
          payment_method: paymentMethod,
          amount_received: amountReceived,
          change: change,
          currency_paid: currencyPaid,
          usd_amount_received: usdAmountReceived,
          status: "COMPLETED",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      
      // Handle missing discount column
      if (error.message?.includes("Could not find the 'discount' column")) {
        console.error(
          "[transactions POST] Discount column not found in database schema. " +
          "Please run the migration to add the discount column."
        );
        return NextResponse.json(
          {
            error: "Database schema is missing the discount column. " +
              "Please contact your administrator or run: npm run migrate:add-discount",
            code: "MIGRATION_REQUIRED",
          },
          { status: 503 }
        );
      }
      
      throw error;
    }

    // Decrement stock for each sold item
    await Promise.all(
      items.map((item) => {
        if (item.variantId) {
          const current = variantMap.get(item.variantId);
          const newQty = (current?.stock_quantity ?? 0) - item.quantity;
          return supabaseAdmin
            .from("product_variants")
            .update({ stock_quantity: Math.max(0, newQty) })
            .eq("id", item.variantId)
            .eq("tenant_id", tenantId);
        } else {
          const current = productMap.get(item.productId);
          const newQty = (current?.stock_quantity ?? 0) - item.quantity;
          return supabaseAdmin
            .from("products")
            .update({ stock_quantity: Math.max(0, newQty) })
            .eq("id", item.productId)
            .eq("tenant_id", tenantId);
        }
      })
    );
    
    return NextResponse.json(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
