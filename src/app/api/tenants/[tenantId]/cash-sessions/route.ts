import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET  /api/tenants/[tenantId]/cash-sessions
 *   ?status=OPEN|CLOSED  (optional)
 *   ?limit=N             (default 50)
 *   ?offset=N            (default 0)
 *
 * POST /api/tenants/[tenantId]/cash-sessions
 *   Body: { name, opening_cash, opened_by_id, employee_ids[], opening_method?,
 *           previous_session_id?, notes?, counts[] }
 *   counts[]: { product_id, variant_id?, product_name, sku, unit_price, opening_qty }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("cash_sessions")
      .select(
        `
        *,
        opened_by:employees!cash_sessions_opened_by_id_fkey(id, first_name, last_name),
        closed_by:employees!cash_sessions_closed_by_id_fkey(id, first_name, last_name),
        cash_session_employees(employee_id, employees(id, first_name, last_name)),
        cash_session_counts(*)
        `
      )
      .eq("tenant_id", tenantId)
      .order("opened_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "OPEN" || status === "CLOSED") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    console.error("[cash-sessions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const {
      name,
      opening_cash,
      opened_by_id,
      employee_ids = [],
      opening_method = "COUNTED",
      previous_session_id = null,
      notes = "",
      counts = [],
      opened_at = null,
    } = body;

    if (!name || opening_cash == null || !opened_by_id) {
      return NextResponse.json(
        { error: "name, opening_cash and opened_by_id are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Create the session
    const { data: session, error: sessionErr } = await supabase
      .from("cash_sessions")
      .insert({
        tenant_id: tenantId,
        name,
        status: "OPEN",
        opening_cash,
        opened_by_id,
        opening_method,
        previous_session_id,
        notes,
        ...(opened_at ? { opened_at } : {}),
      })
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    // 2. Link employees
    if (employee_ids.length > 0) {
      const empRows = employee_ids.map((id: string) => ({
        session_id: session.id,
        employee_id: id,
      }));
      const { error: empErr } = await supabase
        .from("cash_session_employees")
        .insert(empRows);
      if (empErr) throw empErr;
    }

    // 3. Insert opening counts
    if (counts.length > 0) {
      const countRows = counts.map((c: {
        product_id: string;
        variant_id?: string;
        product_name: string;
        sku?: string;
        unit_price: number;
        opening_qty: number;
      }) => ({
        session_id: session.id,
        product_id: c.product_id,
        variant_id: c.variant_id ?? null,
        product_name: c.product_name,
        sku: c.sku ?? "",
        unit_price: c.unit_price,
        opening_qty: c.opening_qty,
      }));
      const { error: countErr } = await supabase
        .from("cash_session_counts")
        .insert(countRows);
      if (countErr) throw countErr;
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("[cash-sessions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
