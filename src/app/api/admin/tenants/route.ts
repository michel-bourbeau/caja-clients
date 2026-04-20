import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/tenants
 * Récupère tous les tenants
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, plan")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
