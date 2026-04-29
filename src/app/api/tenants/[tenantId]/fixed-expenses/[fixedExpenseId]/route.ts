import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; fixedExpenseId: string }> }
) {
  try {
    const { tenantId, fixedExpenseId } = await params;
    const body = await request.json();
    const supabaseAdmin = getSupabaseAdmin();

    const { name, amount, category, supplier_id, day_of_month, is_active, notes } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }
    const day = day_of_month !== undefined ? parseInt(day_of_month) : undefined;
    if (day !== undefined && (day < 1 || day > 28)) {
      return NextResponse.json({ error: "El día del mes debe estar entre 1 y 28" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (amount !== undefined) updates.amount = parseFloat(amount.toString());
    if (category !== undefined) updates.category = category || null;
    if (supplier_id !== undefined) updates.supplier_id = supplier_id || null;
    if (day !== undefined) updates.day_of_month = day;
    if (is_active !== undefined) updates.is_active = is_active;
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabaseAdmin
      .from("fixed_expenses")
      .update(updates)
      .eq("id", fixedExpenseId)
      .eq("tenant_id", tenantId)
      .select("*, suppliers(id, name)")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /fixed-expenses/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; fixedExpenseId: string }> }
) {
  try {
    const { tenantId, fixedExpenseId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("fixed_expenses")
      .delete()
      .eq("id", fixedExpenseId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /fixed-expenses/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
