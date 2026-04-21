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
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/tenants/[tenantId]/products/[productId]/variants
 * Create a new variant
 * Body: { label, sku, price, stock_quantity }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { tenantId, productId } = await params;
  const body = await req.json();
  const { label, sku, price, stock_quantity } = body;

  if (!label?.trim() || !sku?.trim() || price === undefined) {
    return NextResponse.json({ error: "label, sku et price sont requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

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
        stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
