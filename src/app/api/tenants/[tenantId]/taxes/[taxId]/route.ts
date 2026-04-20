import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/tenants/[tenantId]/taxes/[taxId]
 * Update a tax
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; taxId: string }> }
) {
  try {
    const { tenantId, taxId } = await params;
    const { name, rate, is_active } = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (rate !== undefined) updates.rate = parseFloat(rate);
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from("tenant_taxes")
      .update(updates)
      .eq("id", taxId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Taxe non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]/taxes/[taxId]
 * Delete a tax
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; taxId: string }> }
) {
  try {
    const { tenantId, taxId } = await params;

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("tenant_taxes")
      .delete()
      .eq("id", taxId)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
