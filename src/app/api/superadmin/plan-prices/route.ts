import { NextResponse } from "next/server";

// Store plan prices in-memory (in production, would use database)
let planPrices: Record<string, number> = {
  basic: 475,
  professional: 1150,
  enterprise: 2050,
  custom: 0,
};

/**
 * GET /api/superadmin/plan-prices
 * Récupère les prix de tous les forfaits
 */
export async function GET() {
  try {
    return NextResponse.json({ prices: planPrices });
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

    // Update plan prices
    planPrices = prices;

    return NextResponse.json({
      message: "Prix des forfaits mis à jour avec succès",
      prices: planPrices,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des prix" },
      { status: 500 }
    );
  }
}
