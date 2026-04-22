import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("expense_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .order("sort_order");

    // If table doesn't exist yet, return empty array (graceful fallback)
    if (error && error.code === "PGRST116") {
      return NextResponse.json([]);
    }

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    // Log error for debugging but return empty array to prevent UI breaking
    console.error("Error fetching expense categories:", error);
    return NextResponse.json([]);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { name, description, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("expense_categories")
      .insert([
        {
          tenant_id: tenantId,
          name: name.trim(),
          description: description || null,
          sort_order: sort_order || 0,
          status: "ACTIVE",
        },
      ])
      .select()
      .single();

    if (error) {
      // Table doesn't exist yet
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "La tabla de categorías no existe aún. Por favor ejecuta las migraciones." },
          { status: 503 }
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Esta categoría ya existe" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating expense category:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
