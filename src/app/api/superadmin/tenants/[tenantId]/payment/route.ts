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
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId manquant" },
        { status: 400 }
      );
    }

    // Get tenant payment info - start with basic columns only
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId);

    if (tenantError) {
      console.error("Tenant lookup error:", tenantError, "tenantId:", tenantId);
      return NextResponse.json(
        { error: `Erreur BD: ${tenantError.message}` },
        { status: 500 }
      );
    }

    if (!tenants || tenants.length === 0) {
      console.error("Tenant not found:", tenantId);
      return NextResponse.json(
        { error: `Tenant non trouvé (id: ${tenantId})` },
        { status: 404 }
      );
    }

    const tenant = tenants[0];

    // Get payment history
    const { data: history, error: historyError } = await supabase
      .from("payment_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false });

    if (historyError) {
      console.error("Payment history error:", historyError);
      return NextResponse.json(
        { error: `Erreur historique: ${historyError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenant,
      history: history || [],
    });
  } catch (error) {
    console.error("GET payment error:", error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : "unknown"}` },
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
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const {
      plan,
      amount,
      paid_until,
      payment_method,
      notes,
    } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId manquant" },
        { status: 400 }
      );
    }

    if (!plan || !amount || !paid_until) {
      return NextResponse.json(
        { error: "Paramètres manquants (plan, amount, paid_until)" },
        { status: 400 }
      );
    }

    // Get tenant's current info - use select all to avoid column not found errors
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId);

    if (tenantError) {
      console.error("Tenant lookup error in PUT:", tenantError, "tenantId:", tenantId);
      return NextResponse.json(
        { error: `Erreur BD: ${tenantError.message}` },
        { status: 500 }
      );
    }

    if (!tenants || tenants.length === 0) {
      console.error("Tenant not found in PUT:", tenantId);
      return NextResponse.json(
        { error: `Tenant non trouvé (id: ${tenantId})` },
        { status: 404 }
      );
    }

    const tenant = tenants[0];

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
      console.error("Payment insertion error:", paymentError);
      return NextResponse.json(
        { error: `Erreur paiement: ${paymentError.message}` },
        { status: 500 }
      );
    }

    // Update tenant's payment status - only update columns that exist
    const updateData: any = {
      is_paid: true,
    };
    
    // Try to add optional columns if they should exist
    if ('paid_until' in tenant) {
      updateData.paid_until = new Date(paid_until).toISOString();
    }
    if ('current_plan_price' in tenant) {
      updateData.current_plan_price = Number(amount);
    }

    const { data: updatedTenant, error: updateError } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId)
      .select();

    if (updateError) {
      console.error("Tenant update error:", updateError);
      return NextResponse.json(
        { error: `Erreur mise à jour: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Paiement enregistré avec succès",
      payment: paymentData?.[0],
      tenant: updatedTenant?.[0],
    });
  } catch (error) {
    console.error("PUT payment error:", error);
    return NextResponse.json(
      { error: `Erreur serveur: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
