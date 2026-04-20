import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const { tenantId, transactionId } = await params;
    console.log("[transactions DELETE] Deleting transaction:", transactionId, "for tenant:", tenantId);

    const supabaseAdmin = getSupabaseAdmin();

    // Verify transaction exists and belongs to this tenant
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !transaction) {
      console.error("[transactions DELETE] Transaction not found:", fetchError);
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      );
    }

    // Delete the transaction
    const { error: deleteError } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("[transactions DELETE] Delete error:", deleteError);
      throw deleteError;
    }

    console.log("[transactions DELETE] Transaction deleted successfully:", transactionId);
    return NextResponse.json({ success: true, message: "Transacción eliminada exitosamente" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[transactions DELETE] Error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const { tenantId, transactionId } = await params;
    const body = await request.json();
    const { payment_method, created_at } = body;

    console.log("[transactions PUT] Updating transaction:", transactionId, "for tenant:", tenantId);
    console.log("[transactions PUT] Updates:", { payment_method, created_at });

    const supabaseAdmin = getSupabaseAdmin();

    // Verify transaction exists and belongs to this tenant
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !transaction) {
      console.error("[transactions PUT] Transaction not found:", fetchError);
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (payment_method !== undefined) {
      updateData.payment_method = payment_method;
    }
    if (created_at !== undefined) {
      updateData.created_at = created_at;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update the transaction
    const { data, error: updateError } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[transactions PUT] Update error:", updateError);
      throw updateError;
    }

    console.log("[transactions PUT] Transaction updated successfully:", transactionId);
    return NextResponse.json(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[transactions PUT] Error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
