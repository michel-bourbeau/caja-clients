import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("fixed_expenses")
      .select("*, suppliers(id, name)")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /fixed-expenses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const supabaseAdmin = getSupabaseAdmin();

    const { name, amount, category, supplier_id, day_of_month, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }
    const day = parseInt(day_of_month) || 1;
    if (day < 1 || day > 28) {
      return NextResponse.json({ error: "El día del mes debe estar entre 1 y 28" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("fixed_expenses")
      .insert([
        {
          tenant_id: tenantId,
          name: name.trim(),
          amount: parseFloat(amount.toString()),
          category: category || null,
          supplier_id: supplier_id || null,
          day_of_month: day,
          is_active: true,
          notes: notes || null,
        },
      ])
      .select("*, suppliers(id, name)")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /fixed-expenses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
