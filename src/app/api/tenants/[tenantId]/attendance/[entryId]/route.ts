import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PATCH /api/tenants/[tenantId]/attendance/[entryId]
 * Body: { checkOut?: string (ISO), notes?: string }
 * Used to record check-out or update notes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; entryId: string }> }
) {
  try {
    const { tenantId, entryId } = await params;
    const body = await request.json();
    const { checkOut, notes } = body;

    const supabase = getSupabaseAdmin();

    // Verify the entry belongs to this tenant
    const { data: existing, error: fetchError } = await supabase
      .from("time_entries")
      .select("id, check_in, check_out")
      .eq("id", entryId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });
    }

    // Validate check_out is after check_in
    if (checkOut) {
      const inTime = new Date(existing.check_in).getTime();
      const outTime = new Date(checkOut).getTime();
      if (outTime <= inTime) {
        return NextResponse.json(
          { error: "La hora de salida debe ser posterior a la entrada" },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (checkOut !== undefined) updates.check_out = checkOut;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from("time_entries")
      .update(updates)
      .eq("id", entryId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]/attendance/[entryId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; entryId: string }> }
) {
  try {
    const { tenantId, entryId } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entryId)
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
