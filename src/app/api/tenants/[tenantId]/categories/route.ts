import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/tenants/[tenantId]/categories
 * Fetch all categories for a tenant, ordered by sort_order
 */
export async function GET(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/**
 * POST /api/tenants/[tenantId]/categories
 * Create a new category
 */
export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { name, description } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: "Le nom de la catégorie est requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Place new category at the end
  const { count } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { data, error } = await supabase
    .from("product_categories")
    .insert([{
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      sort_order: count ?? 0,
    }])
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}

/**
 * PATCH /api/tenants/[tenantId]/categories
 * Bulk update sort_order for categories
 * Body: { order: [{ id, sort_order }] }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { order } = await request.json();

  if (!Array.isArray(order)) {
    return Response.json({ error: "order array required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  await Promise.all(
    order.map(({ id, sort_order }: { id: string; sort_order: number }) =>
      supabase
        .from("product_categories")
        .update({ sort_order })
        .eq("id", id)
        .eq("tenant_id", tenantId)
    )
  );

  return Response.json({ success: true });
}
