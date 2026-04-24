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
    const { name, sku, price, quantity, category_id, description, min_stock, image } = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (sku !== undefined) updates.sku = sku.trim().toUpperCase();
    if (price !== undefined) updates.price = parseFloat(price);
    if (quantity !== undefined) updates.stock_quantity = parseInt(quantity);
    if (category_id !== undefined) updates.category_id = category_id;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (min_stock !== undefined) updates.min_stock = parseInt(min_stock);
    if (image !== undefined) updates.image = image;

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
 * PATCH /api/tenants/[tenantId]/products/[productId]
 * Partial update of a product (e.g., just stock_quantity)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; productId: string }> }
) {
  try {
    const { tenantId, productId } = await params;
    const body = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.sku !== undefined) updates.sku = body.sku.trim().toUpperCase();
    if (body.price !== undefined) updates.price = parseFloat(body.price);
    if (body.stock_quantity !== undefined) updates.stock_quantity = parseInt(body.stock_quantity);
    if (body.quantity !== undefined) updates.stock_quantity = parseInt(body.quantity);
    if (body.category_id !== undefined) updates.category_id = body.category_id;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.min_stock !== undefined) updates.min_stock = parseInt(body.min_stock);
    if (body.image !== undefined) updates.image = body.image;

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
