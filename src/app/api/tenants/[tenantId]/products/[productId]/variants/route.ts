import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ tenantId: string; productId: string }> };

/**
 * GET /api/tenants/[tenantId]/products/[productId]/variants
 * List all variants for a product
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantId, productId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/tenants/[tenantId]/products/[productId]/variants
 * Create a new variant
 * Body: { label, sku, price, stock_quantity, min_stock?, sort_order? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { tenantId, productId } = await params;
  const body = await req.json();
  const { label, sku, price, cost_price, stock_quantity, min_stock, sort_order } = body;

  if (!label?.trim() || !sku?.trim() || price === undefined) {
    return NextResponse.json({ error: "label, sku et price sont requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let nextSortOrder: number;
  
  // If sort_order is provided (from frontend batch creation), use it
  if (typeof sort_order === "number" && !isNaN(sort_order)) {
    nextSortOrder = sort_order;
  } else {
    // Otherwise, calculate based on existing variants (fallback for single creation)
    const { data: maxData } = await supabase
      .from("product_variants")
      .select("sort_order")
      .eq("product_id", productId)
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    nextSortOrder = (maxData?.sort_order ?? -1) + 1;
  }

  // Ensure parent product has has_variants = true
  await supabase
    .from("products")
    .update({ has_variants: true })
    .eq("id", productId)
    .eq("tenant_id", tenantId);

  const { data, error } = await supabase
    .from("product_variants")
    .insert([
      {
        tenant_id: tenantId,
        product_id: productId,
        label: label.trim(),
        sku: sku.trim().toUpperCase(),
        price: parseFloat(price),
        cost_price: cost_price !== undefined ? parseFloat(cost_price) : 0,
        stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
        min_stock: min_stock ? parseInt(min_stock) : 0,
        sort_order: nextSortOrder,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
