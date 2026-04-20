import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/tenants/[tenantId]/products/[productId]
 * Update a product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; productId: string }> }
) {
  try {
    const { tenantId, productId } = await params;
    const { name, sku, price, quantity, category_id, description } = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (sku !== undefined) updates.sku = sku.trim().toUpperCase();
    if (price !== undefined) updates.price = parseFloat(price);
    if (quantity !== undefined) updates.stock_quantity = parseInt(quantity);
    if (category_id !== undefined) updates.category_id = category_id;
    if (description !== undefined) updates.description = description?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", productId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Map stock_quantity to quantity for compatibility with frontend
    const mappedData = {
      ...data,
      quantity: data.stock_quantity,
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]/products/[productId]
 * Delete a product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; productId: string }> }
) {
  try {
    const { tenantId, productId } = await params;

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
