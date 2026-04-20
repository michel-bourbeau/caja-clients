import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from "@/lib/types/roles";

/**
 * GET /api/tenants/[tenantId]/roles
 * Returns tenant custom roles. If none exist yet, seeds from DEFAULT_ROLES.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tenant_roles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // First time — seed from defaults
    if (!data || data.length === 0) {
      const seeds = DEFAULT_ROLES.map((r) => ({
        tenant_id: tenantId,
        slug: r.id,
        name: r.name,
        description: r.description ?? null,
        permissions: r.permissions,
        is_system: r.isSystem ?? false,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from("tenant_roles")
        .insert(seeds)
        .select();

      if (seedError) throw seedError;
      return NextResponse.json(seeded ?? []);
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/roles
 * Create a new custom role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { name, description, permissions } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    // Validate permissions against known list
    const validIds = new Set(DEFAULT_PERMISSIONS.map((p) => p.id));
    const cleanPerms: string[] = (permissions ?? []).filter((p: string) => validIds.has(p));

    const supabase = getSupabaseAdmin();

    const slug = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const { data, error } = await supabase
      .from("tenant_roles")
      .insert([{
        tenant_id: tenantId,
        slug,
        name: name.trim(),
        description: description?.trim() ?? null,
        permissions: cleanPerms,
        is_system: false,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Un rôle avec ce nom existe déjà" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
