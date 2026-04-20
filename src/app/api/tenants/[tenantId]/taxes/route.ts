import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/taxes
 * Get tax settings for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    console.log("[taxes GET] Fetching taxes for tenant:", tenantId);
    
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("tenant_taxes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[taxes GET] Supabase error:", error);
      throw error;
    }

    console.log("[taxes GET] Found taxes:", data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[taxes GET] Error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/taxes
 * Create a new tax
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { name, rate, is_active } = await request.json();

    if (!name?.trim() || rate === undefined) {
      return NextResponse.json(
        { error: "Nom et taux sont requis" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("tenant_taxes")
      .insert([
        {
          tenant_id: tenantId,
          name: name.trim(),
          rate: parseFloat(rate),
          is_active: is_active ?? true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
