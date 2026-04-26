import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/superadmin/tenants/[tenantId]/payment
 * Récupère les informations de paiement d'un tenant
 */
export async function GET(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;

    // Get tenant payment info
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, plan, is_paid, paid_until, trial_ends_at, current_plan_price")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      );
    }

    // Get payment history
    const { data: history, error: historyError } = await supabase
      .from("payment_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false });

    if (historyError) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenant,
      history: history || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/tenants/[tenantId]/payment
 * Marque un paiement pour un tenant (définit la date d'expiration)
 */
export async function PUT(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    const body = await request.json();
    const {
      plan,
      amount,
      paid_until,
      payment_method,
      notes,
    } = body;

    if (!plan || !amount || !paid_until) {
      return NextResponse.json(
        { error: "Paramètres manquants (plan, amount, paid_until)" },
        { status: 400 }
      );
    }

    // Get tenant's current plan price
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, plan, current_plan_price")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      );
    }

    // Create payment history entry
    const { data: paymentData, error: paymentError } = await supabase
      .from("payment_history")
      .insert({
        tenant_id: tenantId,
        plan,
        amount: Number(amount),
        paid_until: new Date(paid_until).toISOString(),
        payment_method: payment_method || null,
        notes: notes || null,
        payment_date: new Date().toISOString(),
      })
      .select();

    if (paymentError) {
      return NextResponse.json(
        { error: `Erreur: ${paymentError.message}` },
        { status: 500 }
      );
    }

    // Update tenant's payment status
    const { data: updatedTenant, error: updateError } = await supabase
      .from("tenants")
      .update({
        paid_until: new Date(paid_until).toISOString(),
        is_paid: true,
        current_plan_price: Number(amount),
      })
      .eq("id", tenantId)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: `Erreur: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Paiement enregistré avec succès",
      payment: paymentData?.[0],
      tenant: updatedTenant?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
