import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { DEFAULT_PERMISSIONS } from "@/lib/types/roles";
import { getFeaturesForPlan } from "@/lib/config/planFeatures";

const ALL_PERMISSIONS = DEFAULT_PERMISSIONS.map((p) => p.id);

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
 * Crée un nouveau tenant avec les modules configurés + un admin tenant
 */
export async function POST(request: Request) {
  try {
    const { name, slug, plan, features, adminEmail, adminPassword, adminFirstName, adminLastName } = await request.json();

    // Validations
    if (!name || !slug) {
      return NextResponse.json(
        { message: "Nom et slug sont requis" },
        { status: 400 }
      );
    }
    if (adminEmail && !adminPassword) {
      return NextResponse.json(
        { message: "Un mot de passe est requis pour créer l'admin" },
        { status: 400 }
      );
    }
    if (adminPassword && adminPassword.length < 6) {
      return NextResponse.json(
        { message: "Le mot de passe admin doit contenir au moins 6 caractères" },
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
    const tenantPlan = plan || "basic";
    // Use plan defaults as the base; allow explicit overrides passed in the request body
    const tenantFeatures = { ...getFeaturesForPlan(tenantPlan), ...(features ?? {}) };

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        plan: tenantPlan,
        features: tenantFeatures,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 jours
        is_paid: false,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // ── Créer l'admin du tenant si email fourni ────────────────────────────────
    if (adminEmail) {
      let authUserId: string | null = null;

      try {
        // 1. Créer le compte Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            first_name: adminFirstName || "Admin",
            last_name: adminLastName || name,
            role_id: "admin",
            tenant_id: tenant.id,
          },
        });

        if (authError) throw authError;
        authUserId = authData.user.id;

        // 2. Créer l'enregistrement dans la table users
        const { error: userError } = await supabase
          .from("users")
          .insert({
            id: authUserId,
            tenant_id: tenant.id,
            email: adminEmail,
            first_name: adminFirstName || "Admin",
            last_name: adminLastName || name,
            role_id: "admin",
            permissions: ALL_PERMISSIONS,
            status: "ACTIVE",
          });

        if (userError) {
          // Rollback: supprimer le compte Auth créé
          await supabase.auth.admin.deleteUser(authUserId);
          throw userError;
        }
      } catch (adminError) {
        // Rollback: supprimer le tenant si l'admin n'a pas pu être créé
        await supabase.from("tenants").delete().eq("id", tenant.id);
        return NextResponse.json(
          { message: `Tenant supprimé — erreur création admin: ${adminError instanceof Error ? adminError.message : "Erreur inconnue"}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ...tenant, adminEmail, adminCreated: true },
        { status: 201 }
      );
    }

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Erreur création tenant:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création du tenant" },
      { status: 500 }
    );
  }
}
