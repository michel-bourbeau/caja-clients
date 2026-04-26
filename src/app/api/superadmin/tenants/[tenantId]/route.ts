import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * PUT /api/superadmin/tenants/[tenantId]
 * Mettre à jour les modules, plan, et statut de paiement d'un tenant
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { features, plan, is_paid, trial_ends_at, paid_until } = await request.json();

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

    // Mettre à jour les fields fournis
    const updateData: Record<string, unknown> = {};
    if (features) updateData.features = features;
    if (plan) updateData.plan = plan;
    if (typeof is_paid === "boolean") updateData.is_paid = is_paid;
    if (trial_ends_at !== undefined) updateData.trial_ends_at = trial_ends_at;
    if (paid_until !== undefined) updateData.paid_until = paid_until;

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

/**
 * DELETE /api/superadmin/tenants/[tenantId]
 * Supprimer un tenant et TOUTES ses données associées
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

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

    // ─── Phase 1: Récupérer tous les user IDs du tenant pour supprimer de Auth ───
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId);

    if (usersError) throw usersError;

    // Supprimer de Supabase Auth
    const userIds = users?.map((u) => u.id) ?? [];
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId);
    }

    // ─── Phase 2: Supprimer les données du tenant (cascade par RLS) ───
    // Les tables supprimées (dans l'ordre de dépendances):
    // 1. Tables dépendantes sans FK forte
    // 2. Tables de référence
    // 3. Table tenant elle-même

    const tablesToDelete = [
      "time_entries",
      "salary_payments",
      "bonus_payments",
      "vacation_records",
      "payroll_configs",
      "salary_payments",
      "transactions",
      "transaction_items",
      "cash_closings",
      "expenses",
      "expense_categories",
      "products",
      "product_variants",
      "product_categories",
      "inventory_adjustments",
      "loyalty_settings",
      "loyalty_customers",
      "loyalty_purchases",
      "loyalty_rewards",
      "tenant_settings",
      "roles",
      "permissions",
      "employees",
      "users",
      "tenant_roles",
      "tenants",
    ];

    for (const table of tablesToDelete) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("tenant_id", tenantId);

      // Ignorer les erreurs si la table n'existe pas ou n'a pas de tenant_id
      if (deleteError && !deleteError.message.includes("does not exist")) {

      }
    }

    // ─── Phase 3: Supprimer le tenant lui-même ───
    const { error: tenantDeleteError } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    if (tenantDeleteError) throw tenantDeleteError;

    return NextResponse.json(
      { message: "Tenant et toutes ses données supprimés avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur suppression tenant:", error);
    return NextResponse.json(
      { message: `Erreur lors de la suppression du tenant: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
