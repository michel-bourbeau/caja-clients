import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET  /api/tenants/[tenantId]/products/track-in-count
 *   Returns all products with their track_in_count flag.
 *   Grouped by category for the admin config page.
 *
 * POST /api/tenants/[tenantId]/products/track-in-count
 *   Body: { updates: { product_id: string; track_in_count: boolean }[] }
 *   Bulk-updates track_in_count for multiple products at once.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("products")
      .select(`id, name, sku, price, stock_quantity, category_id, track_in_count, has_variants,
        product_categories(id, name),
        product_variants(id, label, sku, price, stock_quantity, sort_order)`)
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    console.error("[products/track-in-count GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { updates } = body as {
      updates: { product_id: string; track_in_count: boolean }[];
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Run updates in parallel (each is a single-row update by id + tenant_id)
    const promises = updates.map(({ product_id, track_in_count }) =>
      supabase
        .from("products")
        .update({ track_in_count: Boolean(track_in_count) })
        .eq("id", product_id)
        .eq("tenant_id", tenantId)
    );

    const results = await Promise.all(promises);
    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      console.error("[products/track-in-count POST] partial failures:", failed.map((r) => r.error));
      return NextResponse.json(
        { error: "Some updates failed", details: failed.map((r) => r.error?.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ updated: updates.length });
  } catch (err) {
    console.error("[products/track-in-count POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
