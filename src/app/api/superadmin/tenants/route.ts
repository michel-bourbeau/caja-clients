import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/superadmin/tenants
 * Récupère tous les tenants
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors du chargement des tenants" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/tenants
 * Crée un nouveau tenant avec les modules configurés
 */
export async function POST(request: Request) {
  try {
    const { name, slug, plan, features } = await request.json();

    // Validations
    if (!name || !slug) {
      return NextResponse.json(
        { message: "Nom et slug sont requis" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Vérifier que le slug est unique
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: "Ce slug est déjà utilisé" },
        { status: 400 }
      );
    }

    // Créer le tenant
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        plan: plan || "basic",
        features: features || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erreur création tenant:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création du tenant" },
      { status: 500 }
    );
  }
}
