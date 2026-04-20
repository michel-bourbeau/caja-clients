import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/categories
 * Fetch all categories for a tenant
 */
export async function GET(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("tenant_id", tenantId)
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

  const { data, error } = await supabase
    .from("product_categories")
    .insert([
      {
        tenant_id: tenantId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
