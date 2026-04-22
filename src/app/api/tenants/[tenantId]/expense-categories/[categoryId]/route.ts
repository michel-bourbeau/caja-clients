import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; categoryId: string }> }
) {
  try {
    const { tenantId, categoryId } = await params;
    const body = await request.json();
    const { name, description, sort_order } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // Check if category exists
    const { data: category, error: fetchError } = await supabaseAdmin
      .from("expense_categories")
      .select("*")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .single();

    // Table doesn't exist yet
    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { error: "La tabla de categorías no existe aún" },
        { status: 503 }
      );
    }

    if (fetchError || !category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("expense_categories")
      .update({
        name: name?.trim() || category.name,
        description: description !== undefined ? description : category.description,
        sort_order: sort_order !== undefined ? sort_order : category.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
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
    console.error("Error updating expense category:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; categoryId: string }> }
) {
  try {
    const { tenantId, categoryId } = await params;

    const supabaseAdmin = getSupabaseAdmin();

    // Check if category exists
    const { data: category, error: fetchError } = await supabaseAdmin
      .from("expense_categories")
      .select("*")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .single();

    // Table doesn't exist
    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json(
        { error: "La tabla de categorías no existe aún" },
        { status: 503 }
      );
    }

    if (fetchError || !category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Check if category is in use (soft delete instead)
    const { data: expensesCount } = await supabaseAdmin
      .from("expenses")
      .select("id", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("category", category.name);

    if (expensesCount && expensesCount.length > 0) {
      // Soft delete - set status to INACTIVE
      const { data, error } = await supabaseAdmin
        .from("expense_categories")
        .update({ status: "INACTIVE" })
        .eq("id", categoryId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Hard delete if no expenses using this category
    const { error: deleteError } = await supabaseAdmin
      .from("expense_categories")
      .delete()
      .eq("id", categoryId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense category:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
