import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/tenants/[tenantId]/features
 * Récupère les modules activés pour un tenant
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tenants")
      .select("features")
      .eq("id", tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      features: data.features || {},
    });
  } catch (error) {
    console.error("Error fetching features:", error);
    return NextResponse.json(
      { message: "Error fetching features" },
      { status: 500 }
    );
  }
}
