import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const { tenantId, transactionId } = await params;

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch transaction to restore inventory
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

    // ✅ Restore inventory before deleting transaction
    const items = transaction.items || [];
    
    // Extract variant and regular items
    const variantItems = items.filter((i: any) => i.variant_id || i.variantId);
    const regularItems = items.filter((i: any) => !i.variant_id && !i.variantId);

    // Restore regular product inventory
    if (regularItems.length > 0) {
      const productIds = regularItems.map((item: any) => item.product_id || item.productId);
      
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, stock_quantity")
        .in("id", productIds)
        .eq("tenant_id", tenantId);

      const productMap = new Map();
      (products || []).forEach((p: any) => productMap.set(p.id, p.stock_quantity));

      await Promise.all(
        regularItems.map((item: any) => {
          const itemId = item.product_id || item.productId;
          const currentStock = productMap.get(itemId) || 0;
          const newStock = currentStock + item.quantity;
          

          
          return supabaseAdmin
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", itemId)
            .eq("tenant_id", tenantId);
        })
      );
    }

    // Restore variant inventory
    if (variantItems.length > 0) {
      const variantIds = variantItems.map((item: any) => item.variant_id || item.variantId);
      
      const { data: variants } = await supabaseAdmin
        .from("product_variants")
        .select("id, stock_quantity")
        .in("id", variantIds)
        .eq("tenant_id", tenantId);

      const variantMap = new Map();
      (variants || []).forEach((v: any) => variantMap.set(v.id, v.stock_quantity));

      await Promise.all(
        variantItems.map((item: any) => {
          const itemId = item.variant_id || item.variantId;
          const currentStock = variantMap.get(itemId) || 0;
          const newStock = currentStock + item.quantity;
          

          
          return supabaseAdmin
            .from("product_variants")
            .update({ stock_quantity: newStock })
            .eq("id", itemId)
            .eq("tenant_id", tenantId);
        })
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


    return NextResponse.json({ 
      success: true, 
      message: "Transacción eliminada exitosamente e inventario restaurado",
      itemsRestored: items.length
    });
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
    const { payment_method, created_at, amount_received, change } = body;



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
    if (amount_received !== undefined) {
      updateData.amount_received = amount_received;
    }
    if (change !== undefined) {
      updateData.change = change;
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
