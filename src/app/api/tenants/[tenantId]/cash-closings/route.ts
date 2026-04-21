import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/cash-closings
 * Returns all closings ordered newest first.
 *
 * Query params:
 *   ?date=2026-04-21          → saved closing for that date (or null)
 *   ?date=2026-04-21&preview  → computed system totals from transactions (no saving required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const preview = searchParams.has("preview");
    const supabaseAdmin = getSupabaseAdmin();

    // Preview mode: compute system totals from transactions for a date (no saved closing needed)
    if (date && preview) {
      const dateStart = new Date(`${date}T00:00:00-06:00`).toISOString();
      const dateEnd   = new Date(`${date}T23:59:59-06:00`).toISOString();

      const { data: txs, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("payment_method, total")
        .eq("tenant_id", tenantId)
        .eq("status", "COMPLETED")
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);

      if (txError) throw txError;

      const rows = txs ?? [];
      const system_cash     = rows.filter((t) => t.payment_method === "CASH").reduce((s, t) => s + Number(t.total), 0);
      const system_card     = rows.filter((t) => t.payment_method === "CARD").reduce((s, t) => s + Number(t.total), 0);
      const system_transfer = rows.filter((t) => t.payment_method === "TRANSFER").reduce((s, t) => s + Number(t.total), 0);
      const system_total    = system_cash + system_card + system_transfer;
      const tx_count        = rows.length;

      return NextResponse.json({
        system_cash:     Math.round(system_cash     * 100) / 100,
        system_card:     Math.round(system_card     * 100) / 100,
        system_transfer: Math.round(system_transfer * 100) / 100,
        system_total:    Math.round(system_total    * 100) / 100,
        tx_count,
      });
    }

    let query = supabaseAdmin
      .from("cash_closings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("closing_date", { ascending: false });

    if (date) {
      query = query.eq("closing_date", date);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(date ? (data?.[0] ?? null) : (data ?? []));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/cash-closings
 * Create or update (upsert) a closing for a given date.
 *
 * Body: {
 *   closing_date: "2026-04-21",
 *   declared_cash: 1250.00,
 *   declared_card: 3400.00,
 *   notes?: "...",
 *   closed_by?: "Juan"
 * }
 *
 * The system totals are computed here from the transactions table,
 * so the frontend never needs to pass them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { closing_date, declared_cash, declared_card, notes, closed_by } = body;

    if (!closing_date) {
      return NextResponse.json({ error: "closing_date is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Build date range in UTC that covers the Nicaragua local date (UTC-6).
    // Nicaragua = UTC-6, no DST.
    const dateStart = new Date(`${closing_date}T00:00:00-06:00`).toISOString();
    const dateEnd   = new Date(`${closing_date}T23:59:59-06:00`).toISOString();

    // Fetch all completed transactions for that local date
    const { data: txs, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("payment_method, total")
      .eq("tenant_id", tenantId)
      .eq("status", "COMPLETED")
      .gte("created_at", dateStart)
      .lte("created_at", dateEnd);

    if (txError) throw txError;

    const rows = txs ?? [];
    const system_cash     = rows.filter((t) => t.payment_method === "CASH").reduce((s, t) => s + Number(t.total), 0);
    const system_card     = rows.filter((t) => t.payment_method === "CARD").reduce((s, t) => s + Number(t.total), 0);
    const system_transfer = rows.filter((t) => t.payment_method === "TRANSFER").reduce((s, t) => s + Number(t.total), 0);
    const system_total    = system_cash + system_card + system_transfer;

    // Upsert — one closing per tenant per date
    const { data, error } = await supabaseAdmin
      .from("cash_closings")
      .upsert(
        {
          tenant_id:        tenantId,
          closing_date,
          system_cash:      Math.round(system_cash     * 100) / 100,
          system_card:      Math.round(system_card     * 100) / 100,
          system_transfer:  Math.round(system_transfer * 100) / 100,
          system_total:     Math.round(system_total    * 100) / 100,
          declared_cash:    Math.round(Number(declared_cash ?? 0) * 100) / 100,
          declared_card:    Math.round(Number(declared_card ?? 0) * 100) / 100,
          notes:            notes ?? null,
          closed_by:        closed_by ?? null,
        },
        { onConflict: "tenant_id,closing_date" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
