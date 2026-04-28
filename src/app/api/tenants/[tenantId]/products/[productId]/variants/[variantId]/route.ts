import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ tenantId: string; productId: string; variantId: string }> };

/**
 * PUT /api/tenants/[tenantId]/products/[productId]/variants/[variantId]
 * Update a variant
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { tenantId, productId, variantId } = await params;
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, any> = {};
  if (body.label !== undefined) updates.label = body.label.trim();
  if (body.sku !== undefined) updates.sku = body.sku.trim().toUpperCase();
  if (body.price !== undefined) updates.price = parseFloat(body.price);
  if (body.cost_price !== undefined) updates.cost_price = parseFloat(body.cost_price);
  if (body.stock_quantity !== undefined) updates.stock_quantity = parseInt(body.stock_quantity);
  if (body.min_stock !== undefined) updates.min_stock = parseInt(body.min_stock);
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("product_variants")
    .update(updates)
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/tenants/[tenantId]/products/[productId]/variants/[variantId]
 * Partial update of a variant
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { tenantId, productId, variantId } = await params;
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, any> = {};
  if (body.label !== undefined) updates.label = body.label.trim();
  if (body.sku !== undefined) updates.sku = body.sku.trim().toUpperCase();
  if (body.price !== undefined) updates.price = parseFloat(body.price);
  if (body.cost_price !== undefined) updates.cost_price = parseFloat(body.cost_price);
  if (body.stock_quantity !== undefined) updates.stock_quantity = parseInt(body.stock_quantity);
  if (body.min_stock !== undefined) updates.min_stock = parseInt(body.min_stock);
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("product_variants")
    .update(updates)
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/tenants/[tenantId]/products/[productId]/variants/[variantId]
 * Delete a variant. If it was the last variant, unset has_variants on product.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { tenantId, productId, variantId } = await params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if any variants remain; if not, clear has_variants flag
  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("tenant_id", tenantId);

  if (count === 0) {
    await supabase
      .from("products")
      .update({ has_variants: false })
      .eq("id", productId)
      .eq("tenant_id", tenantId);
  }

  return NextResponse.json({ success: true });
}
