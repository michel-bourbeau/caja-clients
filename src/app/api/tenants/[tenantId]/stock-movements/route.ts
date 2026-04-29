import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/stock-movements
 * Returns stock movements with optional filters:
 *  - product_id   (UUID)
 *  - variant_id   (UUID)
 *  - movement_type (sale | restock | adjustment | return | damage | initial)
 *  - from_date    (YYYY-MM-DD)
 *  - to_date      (YYYY-MM-DD)
 *  - limit        (default 100)
 *  - offset       (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);

    const productId    = searchParams.get("product_id");
    const variantId    = searchParams.get("variant_id");
    const movementType = searchParams.get("movement_type");
    const fromDate     = searchParams.get("from_date");
    const toDate       = searchParams.get("to_date");
    const limit        = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset       = parseInt(searchParams.get("offset") || "0");

    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from("stock_movements")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (productId)    query = query.eq("product_id", productId);
    if (variantId)    query = query.eq("variant_id", variantId);
    if (movementType) query = query.eq("movement_type", movementType);
    if (fromDate)     query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
    if (toDate)       query = query.lte("created_at", `${toDate}T23:59:59.999Z`);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ movements: data || [], total: count ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/stock-movements
 * Create a manual stock adjustment (restock, damage, adjustment, return).
 * Also updates the product or variant stock_quantity.
 *
 * Body:
 *  - product_id    (UUID, required)
 *  - variant_id    (UUID, optional)
 *  - movement_type ('restock' | 'adjustment' | 'damage' | 'return', required)
 *  - quantity      (positive integer, required — direction handled by type)
 *  - notes         (string, optional)
 *  - created_by    (string, optional — email of user)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const { product_id, variant_id, movement_type, quantity, notes, created_by } = body;

    if (!product_id || !movement_type || quantity === undefined) {
      return NextResponse.json(
        { error: "product_id, movement_type et quantity sont requis" },
        { status: 400 }
      );
    }

    const allowedManualTypes = ["restock", "adjustment", "damage", "return"];
    if (!allowedManualTypes.includes(movement_type)) {
      return NextResponse.json(
        { error: `movement_type doit être: ${allowedManualTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const qty = Math.abs(parseInt(quantity));
    if (isNaN(qty) || qty === 0) {
      return NextResponse.json(
        { error: "quantity doit être un entier positif non nul" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch product name
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_quantity")
      .eq("id", product_id)
      .eq("tenant_id", tenantId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    let variantLabel: string | null = null;
    let currentQty = product.stock_quantity ?? 0;

    // If variant provided, use variant stock
    if (variant_id) {
      const { data: variant, error: varError } = await supabaseAdmin
        .from("product_variants")
        .select("id, label, stock_quantity")
        .eq("id", variant_id)
        .eq("product_id", product_id)
        .single();

      if (varError || !variant) {
        return NextResponse.json({ error: "Variante non trouvée" }, { status: 404 });
      }

      variantLabel = variant.label;
      currentQty   = variant.stock_quantity ?? 0;
    }

    // Calculate direction: damage = out (negative), others = in (positive)
    const isOut = movement_type === "damage";
    const quantityChange = isOut ? -qty : qty;
    const newQty = Math.max(0, currentQty + quantityChange);

    // Update stock
    if (variant_id) {
      await supabaseAdmin
        .from("product_variants")
        .update({ stock_quantity: newQty })
        .eq("id", variant_id)
        .eq("tenant_id", tenantId);
    } else {
      await supabaseAdmin
        .from("products")
        .update({ stock_quantity: newQty })
        .eq("id", product_id)
        .eq("tenant_id", tenantId);
    }

    // Record movement
    const { data: movement, error: movError } = await supabaseAdmin
      .from("stock_movements")
      .insert([{
        tenant_id:       tenantId,
        product_id,
        variant_id:      variant_id || null,
        product_name:    product.name,
        variant_label:   variantLabel,
        movement_type,
        quantity_change: quantityChange,
        quantity_before: currentQty,
        quantity_after:  newQty,
        notes:           notes?.trim() || null,
        created_by:      created_by || null,
        reference_id:    null,
      }])
      .select()
      .single();

    if (movError) throw movError;

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
