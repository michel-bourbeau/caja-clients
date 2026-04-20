import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_PERMISSIONS } from "@/lib/types/roles";

/**
 * PUT /api/tenants/[tenantId]/roles/[roleId]
 * Update a role's name, description and/or permissions.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; roleId: string }> }
) {
  try {
    const { tenantId, roleId } = await params;
    const { name, description, permissions } = await req.json();

    const validIds = new Set(DEFAULT_PERMISSIONS.map((p) => p.id));
    const cleanPerms: string[] = (permissions ?? []).filter((p: string) => validIds.has(p));

    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() ?? null;
    if (permissions !== undefined) updates.permissions = cleanPerms;

    const { data, error } = await supabase
      .from("tenant_roles")
      .update(updates)
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]/roles/[roleId]
 * Delete a custom role. System roles (is_system=true) cannot be deleted.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; roleId: string }> }
) {
  try {
    const { tenantId, roleId } = await params;
    const supabase = getSupabaseAdmin();

    // Check it's not a system role
    const { data: existing } = await supabase
      .from("tenant_roles")
      .select("is_system")
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .single();

    if (existing?.is_system) {
      return NextResponse.json(
        { error: "Les rôles système ne peuvent pas être supprimés" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("tenant_roles")
      .delete()
      .eq("id", roleId)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
