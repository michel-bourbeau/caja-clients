import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/tenants/[tenantId]/roles
 * Récupère les rôles d'un tenant
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("roles")
      .select("id, name, tenant_id")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
