import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CartItem, Transaction } from "@/lib/types";

function calculateTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * 0.21 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
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
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();

    const items: CartItem[] = body.items;
    const paymentMethod: Transaction["paymentMethod"] = body.paymentMethod;
    const cashierId: string = body.cashierId || "unknown";

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Aucun article dans le panier" }, { status: 400 });
    }

    const productIds = items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, quantity, price")
      .in("id", productIds)
      .eq("tenant_id", tenantId);

    if (productsError) throw productsError;
    if (!products || products.length !== items.length) {
      return NextResponse.json({ error: "Certains produits sont introuvables" }, { status: 400 });
    }

    const productMap = new Map(products.map((product: any) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Produit introuvable: ${item.productId}` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: "La quantité doit être supérieure à 0" }, { status: 400 });
      }
      if (item.quantity > product.quantity) {
        return NextResponse.json({ error: `Stock insuffisant pour ${item.productId}` }, { status: 400 });
      }
    }

    const transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { subtotal, tax, total } = calculateTotals(items);

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          id: transactionId,
          tenant_id: tenantId,
          cashier_id: cashierId,
          items,
          subtotal,
          tax,
          total,
          payment_method: paymentMethod,
          status: "COMPLETED",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await Promise.all(
      items.map((item) => {
        const product = productMap.get(item.productId);
        return supabaseAdmin
          .from("products")
          .update({ quantity: product.quantity - item.quantity })
          .eq("id", item.productId)
          .eq("tenant_id", tenantId);
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
