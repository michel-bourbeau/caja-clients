import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * PUT /api/superadmin/tenants/[tenantId]
 * Mettre à jour les modules d'un tenant
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { features, plan } = await request.json();

    const supabase = getSupabaseAdmin();

    // Vérifier que le tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { message: "Tenant non trouvé" },
        { status: 404 }
      );
    }

    // Mettre à jour les features et le plan
    const updateData: Record<string, unknown> = { features };
    if (plan) updateData.plan = plan;

    const { data, error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur mise à jour tenant:", error);
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du tenant" },
      { status: 500 }
    );
  }
}
