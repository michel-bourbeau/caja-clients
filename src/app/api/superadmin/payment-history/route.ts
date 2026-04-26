import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/superadmin/payment-history?tenantId=xxx
 * Récupère l'historique de paiement d'un tenant
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requis" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payment_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'historique" },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/payment-history
 * Crée une nouvelle entrée de paiement
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      plan,
      amount,
      paid_until,
      payment_method,
      notes,
    } = body;

    if (!tenant_id || !plan || !amount || !paid_until) {
      return NextResponse.json(
        { error: "Paramètres manquants (tenant_id, plan, amount, paid_until)" },
        { status: 400 }
      );
    }

    // Create payment history entry
    const { data: paymentData, error: paymentError } = await supabase
      .from("payment_history")
      .insert({
        tenant_id,
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

    // Update tenant's paid_until date
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .update({
        paid_until: new Date(paid_until).toISOString(),
        is_paid: true,
      })
      .eq("id", tenant_id)
      .select();

    if (tenantError) {
      return NextResponse.json(
        { error: `Erreur: ${tenantError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Paiement enregistré avec succès",
      payment: paymentData?.[0],
      tenant: tenantData?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
