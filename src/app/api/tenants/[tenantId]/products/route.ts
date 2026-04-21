import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*, product_variants(*)")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Map stock_quantity to quantity for compatibility with frontend
    const mappedData = (data || []).map((product: any) => ({
      ...product,
      quantity: product.stock_quantity,
      variants: product.product_variants ?? [],
    }));

    return NextResponse.json(mappedData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/products
 * Create a new product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    console.log("[POST /products] Request body:", body);
    
    const { name, sku, price, quantity, category_id, description } = body;

    if (!name?.trim() || !sku?.trim() || price === undefined) {
      console.log("[POST /products] Validation failed:", { name, sku, price });
      return NextResponse.json(
        { error: "Nom, SKU et prix sont requis" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const productData = {
      tenant_id: tenantId,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      price: parseFloat(price),
      stock_quantity: quantity ? parseInt(quantity) : 0,
      category_id: category_id || null,
      description: description?.trim() || null,
    };

    console.log("[POST /products] Inserting data:", productData);

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error("[POST /products] Database error:", error);
      throw error;
    }

    console.log("[POST /products] Success:", data);
    
    // Map stock_quantity to quantity for compatibility with frontend
    const mappedData = {
      ...data,
      quantity: data.stock_quantity,
    };
    
    return NextResponse.json(mappedData, { status: 201 });
  } catch (error) {
    console.error("[POST /products] Exception:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenants/[tenantId]/products
 * Bulk update sort_order for products
 * Body: { order: [{ id, sort_order }] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { order } = await request.json();

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order array required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    await Promise.all(
      order.map(({ id, sort_order }: { id: string; sort_order: number }) =>
        supabaseAdmin
          .from("products")
          .update({ sort_order })
          .eq("id", id)
          .eq("tenant_id", tenantId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
