import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/superadmin/plan-prices
 * Récupère les prix actuels de tous les forfaits
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("plan_prices")
      .select("*")
      .order("plan", { ascending: true })
      .order("effective_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des prix" },
        { status: 500 }
      );
    }

    // Get the latest price for each plan
    const latestPrices: Record<string, any> = {};
    (data || []).forEach((price: any) => {
      if (!latestPrices[price.plan]) {
        latestPrices[price.plan] = price;
      }
    });

    return NextResponse.json({ prices: latestPrices });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prix" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/plan-prices
 * Met à jour les prix de tous les forfaits
 * Crée une entrée historique pour chaque plan modifié
 */
export async function PUT(request: Request) {
  try {
    const { prices } = await request.json();

    if (!prices || typeof prices !== "object") {
      return NextResponse.json(
        { error: "Format de prix invalide" },
        { status: 400 }
      );
    }

    // Insert new prices for each plan (creates history)
    const priceEntries = Object.entries(prices).map(([plan, price]) => ({
      plan,
      price: Number(price),
      currency: "NIO",
      effective_date: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("plan_prices")
      .insert(priceEntries)
      .select();

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la sauvegarde: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Prix des forfaits mis à jour avec succès",
      prices: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des prix" },
      { status: 500 }
    );
  }
}
