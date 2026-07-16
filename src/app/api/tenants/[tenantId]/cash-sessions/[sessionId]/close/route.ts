import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/tenants/[tenantId]/cash-sessions/[sessionId]/close
 *
 * Closes an OPEN session.
 * Body: {
 *   closed_by_id: string,
 *   closing_cash: number,
 *   counts: { count_id: string; closing_qty: number }[],
 *   notes?: string,
 * }
 *
 * Logic:
 *  1. Fetch POS sales from transactions WHERE cash_session_id = sessionId
 *  2. Compute expected_closing_qty per item
 *  3. Save closing_qty on each cash_session_count
 *  4. Update session: status=CLOSED, closed_at, closed_by_id, closing_cash, POS aggregates
 *
 * Reconciliation (variance) is computed client-side for display.
 * Server stores raw values; the frontend calculates variance for the UI.
 */

type Params = { params: Promise<{ tenantId: string; sessionId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const body = await request.json();

    const {
      closed_by_id,
      closing_cash,
      counts = [],     // [{ count_id, closing_qty }]
      notes,
    } = body;

    if (!closed_by_id || closing_cash == null) {
      return NextResponse.json(
        { error: "closed_by_id and closing_cash are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Guard: session must exist and be OPEN
    const { data: session, error: sessErr } = await supabase
      .from("cash_sessions")
      .select("id, status, opening_cash, tenant_id")
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .single();

    if (sessErr) {
      if (sessErr.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      throw sessErr;
    }

    if (session.status !== "OPEN") {
      return NextResponse.json(
        { error: "Session is already closed" },
        { status: 409 }
      );
    }

    // 1. Aggregate POS transactions for this session
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("total, payment_method, status, items, discount, tax")
      .eq("tenant_id", tenantId)
      .eq("cash_session_id", sessionId)
      .neq("status", "CANCELLED");

    if (txErr) throw txErr;

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    const txCount = txRows?.length ?? 0;

    // Also aggregate sold quantities per product_id/variant_id
    const soldMap: Record<string, number> = {}; // key: `${product_id}|${variant_id ?? ""}`

    for (const tx of txRows ?? []) {
      totalSales += tx.total ?? 0;
      if (tx.payment_method === "CASH")     cashSales     += tx.total ?? 0;
      if (tx.payment_method === "CARD")     cardSales     += tx.total ?? 0;
      if (tx.payment_method === "TRANSFER") transferSales += tx.total ?? 0;

      // Items is a JSONB array: [{ productId, variantId, quantity, ... }]
      const items: { productId?: string; variantId?: string; quantity?: number }[] = tx.items ?? [];
      for (const item of items) {
        const key = `${item.productId ?? ""}|${item.variantId ?? ""}`;
        soldMap[key] = (soldMap[key] ?? 0) + (item.quantity ?? 0);
      }
    }

    // 2. Update each count row with closing_qty, sold_qty, expected_closing_qty
    if (counts.length > 0) {
      // Fetch existing counts to get product/variant ids for soldMap lookup
      const { data: existingCounts, error: ecErr } = await supabase
        .from("cash_session_counts")
        .select("id, product_id, variant_id, opening_qty")
        .eq("session_id", sessionId);

      if (ecErr) throw ecErr;

      const countUpdates = (existingCounts ?? []).map((ec) => {
        const provided = counts.find((c: { count_id: string; closing_qty: number }) => c.count_id === ec.id);
        const key = `${ec.product_id}|${ec.variant_id ?? ""}`;
        const sold = soldMap[key] ?? 0;
        const expected = (ec.opening_qty ?? 0) - sold;

        return supabase
          .from("cash_session_counts")
          .update({
            sold_qty: sold,
            expected_closing_qty: expected,
            closing_qty: provided?.closing_qty ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ec.id);
      });

      await Promise.all(countUpdates);
    }

    // 3. Close the session
    const closedAt = new Date().toISOString();
    const { data: closed, error: closeErr } = await supabase
      .from("cash_sessions")
      .update({
        status: "CLOSED",
        closing_cash,
        closed_at: closedAt,
        closed_by_id,
        notes: notes !== undefined ? notes : undefined,
        total_sales: totalSales,
        cash_sales: cashSales,
        card_sales: cardSales,
        transfer_sales: transferSales,
        tx_count: txCount,
        updated_at: closedAt,
      })
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .select()
      .single();

    if (closeErr) throw closeErr;

    return NextResponse.json({ session: closed });
  } catch (err) {
    console.error("[cash-sessions/[id]/close POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
