import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; expenseId: string }> }
) {
  try {
    const { tenantId, expenseId } = await params;
    const body = await request.json();
    const userId = request.headers.get("x-user-id");

    const supabaseAdmin = getSupabaseAdmin();

    // Check if expense exists and user can edit it
    const { data: expense, error: fetchError } = await supabaseAdmin
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    // Check if user is the creator or has admin permissions
    if (expense.created_by !== userId) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("permissions")
        .eq("id", userId)
        .single();

      const canEdit = userData?.permissions?.includes("expenses.edit");
      if (!canEdit) {
        return NextResponse.json(
          { error: "No tienes permiso para editar este gasto" },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .update(body)
      .eq("id", expenseId)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; expenseId: string }> }
) {
  try {
    const { tenantId, expenseId } = await params;
    const userId = request.headers.get("x-user-id");

    const supabaseAdmin = getSupabaseAdmin();

    // Check if expense exists
    const { data: expense, error: fetchError } = await supabaseAdmin
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    // Check if user is the creator or has admin permissions
    if (expense.created_by !== userId) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("permissions")
        .eq("id", userId)
        .single();

      const canEdit = userData?.permissions?.includes("expenses.edit");
      if (!canEdit) {
        return NextResponse.json(
          { error: "No tienes permiso para eliminar este gasto" },
          { status: 403 }
        );
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
