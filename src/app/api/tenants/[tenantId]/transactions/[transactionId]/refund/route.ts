import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/tenants/[tenantId]/transactions/[transactionId]/refund
 *
 * Processes a full refund for a completed transaction:
 * 1. Marks the original transaction as REFUNDED
 * 2. Creates a new REFUND transaction with negative amounts
 * 3. Restores stock for all items
 * 4. Records a 'return' movement in stock_movements (fire-and-forget)
 *
 * Body (optional):
 *   - reason: string  — reason for refund (stored as cashier_name prefix)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const { tenantId, transactionId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason?.trim() || "";

    const supabase = getSupabaseAdmin();

    // ── 1. Fetch original transaction ──────────────────────────────────────
    const { data: original, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (original.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Impossible de rembourser une transaction avec le statut "${original.status}"` },
        { status: 400 }
      );
    }

    // ── 2. Mark original as REFUNDED ───────────────────────────────────────
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "REFUNDED" })
      .eq("id", transactionId)
      .eq("tenant_id", tenantId);

    if (updateError) throw updateError;

    // ── 3. Build refund transaction (negative amounts) ────────────────────
    const refundId = `REFUND-${transactionId}`;

    // Items with negative quantities so revenue/COGS calculations auto-subtract
    const refundItems = (original.items || []).map((item: any) => ({
      ...item,
      quantity: -Math.abs(item.quantity || 1),
      total: -Math.abs((item.price || 0) * Math.abs(item.quantity || 1)),
    }));

    const { data: refundTx, error: insertError } = await supabase
      .from("transactions")
      .insert([
        {
          id: refundId,
          tenant_id: tenantId,
          cashier_id: original.cashier_id,
          cashier_name: reason
            ? `Remboursement: ${reason}`
            : `Remboursement de ${transactionId}`,
          items: refundItems,
          subtotal: -(original.subtotal || 0),
          discount: -(original.discount || 0),
          tax: -(original.tax || 0),
          tax_breakdown: original.tax_breakdown || [],
          total: -(original.total || 0),
          cost_of_goods_sold: -(original.cost_of_goods_sold || 0),
          profit: -(original.profit || 0),
          payment_method: original.payment_method,
          amount_received: 0,
          change: 0,
          currency_paid: original.currency_paid || "NIO",
          usd_amount_received: 0,
          status: "REFUND",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // ── 4. Restore stock + record movements (fire-and-forget) ────────────
    const items: any[] = original.items || [];
    await Promise.all(
      items.map(async (item: any) => {
        const qty = Math.abs(item.quantity || 1);
        if (item.variantId) {
          // Restore variant stock
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variantId)
            .eq("tenant_id", tenantId)
            .single();

          const before = variant?.stock_quantity ?? 0;
          const after  = before + qty;

          await supabase
            .from("product_variants")
            .update({ stock_quantity: after })
            .eq("id", item.variantId)
            .eq("tenant_id", tenantId);

          try {
            await supabase.from("stock_movements").insert([{
              tenant_id:       tenantId,
              product_id:      item.productId,
              variant_id:      item.variantId,
              product_name:    item.name || "—",
              variant_label:   null,
              movement_type:   "return",
              quantity_change: qty,
              quantity_before: before,
              quantity_after:  after,
              reference_id:    refundId,
              notes:           reason || null,
              created_by:      original.cashier_name || original.cashier_id,
            }]);
          } catch { /* table may not exist yet */ }
        } else if (item.productId) {
          // Restore product stock
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.productId)
            .eq("tenant_id", tenantId)
            .single();

          const before = product?.stock_quantity ?? 0;
          const after  = before + qty;

          await supabase
            .from("products")
            .update({ stock_quantity: after })
            .eq("id", item.productId)
            .eq("tenant_id", tenantId);

          try {
            await supabase.from("stock_movements").insert([{
              tenant_id:       tenantId,
              product_id:      item.productId,
              variant_id:      null,
              product_name:    item.name || "—",
              variant_label:   null,
              movement_type:   "return",
              quantity_change: qty,
              quantity_before: before,
              quantity_after:  after,
              reference_id:    refundId,
              notes:           reason || null,
              created_by:      original.cashier_name || original.cashier_id,
            }]);
          } catch { /* table may not exist yet */ }
        }
      })
    );

    return NextResponse.json(refundTx, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
