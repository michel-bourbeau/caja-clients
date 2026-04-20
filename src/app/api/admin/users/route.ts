import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/admin/users
 * Crée un nouvel utilisateur pour un tenant avec authentification Supabase
 */
export async function POST(request: Request) {
  try {
    const { tenantId, email, password, firstName, lastName, roleId } = await request.json();

    // Validations
    if (!tenantId || !email || !password) {
      return NextResponse.json(
        { message: "Tenant ID, email et password sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Le mot de passe doit faire au moins 8 caractères" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1️⃣ Vérifier que le tenant existe
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

    // 2️⃣ Créer l'utilisateur dans auth.users (Supabase Auth)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ✅ Confirme automatiquement l'email
      user_metadata: {
        tenant_id: tenantId,
        first_name: firstName || "User",
        last_name: lastName || "User",
      },
    });

    if (authError) {
      // Si l'erreur est "user_already_exists", donne un message clair
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { message: "Cet email est déjà utilisé" },
          { status: 400 }
        );
      }
      throw authError;
    }

    const authUserId = authData.user.id;

    // 3️⃣ Créer le profil utilisateur dans la table public.users
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        id: authUserId, // Lien avec auth.users
        tenant_id: tenantId,
        email,
        first_name: firstName || "User",
        last_name: lastName || "User",
        role_id: roleId || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (userError) {
      // Si le profil échoue, on supprime l'user auth
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {
        // Ignore les erreurs de suppression
      });

      throw userError;
    }

    return NextResponse.json(
      {
        message: "Utilisateur créé avec succès",
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          tenant_id: user.tenant_id,
          role_id: user.role_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur création utilisateur:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
        message: "Impossible de créer l'utilisateur",
      },
      { status: 500 }
    );
  }
}
