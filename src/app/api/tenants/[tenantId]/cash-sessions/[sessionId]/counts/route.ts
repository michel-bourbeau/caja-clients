import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET   /api/tenants/[tenantId]/cash-sessions/[sessionId]/counts
 *   Returns all count rows for the session.
 *
 * PATCH /api/tenants/[tenantId]/cash-sessions/[sessionId]/counts
 *   Body: { count_id: string; new_qty: number; recounted_by_id: string; type?: "ITEM"|"CASH" }
 *   Increments recount_attempts, inserts audit record in cash_session_recounts,
 *   and updates the qty (opening or closing depending on session status).
 *
 * POST  /api/tenants/[tenantId]/cash-sessions/[sessionId]/counts/cash-recount
 *   Body: { previous_cash: number; new_cash: number; recounted_by_id: string }
 *   Logs a cash recount event (no count_id — type=CASH).
 */

type Params = { params: Promise<{ tenantId: string; sessionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const supabase = getSupabaseAdmin();

    // Verify session belongs to tenant
    const { error: sessErr } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .single();

    if (sessErr) {
      if (sessErr.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      throw sessErr;
    }

    const { data, error } = await supabase
      .from("cash_session_counts")
      .select("*")
      .eq("session_id", sessionId)
      .order("product_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ counts: data ?? [] });
  } catch (err) {
    console.error("[cash-sessions/[id]/counts GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const body = await request.json();

    const { count_id, new_qty, recounted_by_id } = body;

    if (!count_id || new_qty == null || !recounted_by_id) {
      return NextResponse.json(
        { error: "count_id, new_qty and recounted_by_id are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify session belongs to tenant and get status
    const { data: session, error: sessErr } = await supabase
      .from("cash_sessions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .single();

    if (sessErr) {
      if (sessErr.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      throw sessErr;
    }

    // Fetch current count
    const { data: count, error: countErr } = await supabase
      .from("cash_session_counts")
      .select("id, opening_qty, closing_qty, recount_attempts")
      .eq("id", count_id)
      .eq("session_id", sessionId)
      .single();

    if (countErr) {
      if (countErr.code === "PGRST116") {
        return NextResponse.json({ error: "Count not found" }, { status: 404 });
      }
      throw countErr;
    }

    // Guard: max 3 recounts per item (admin must unlock beyond that)
    if (count.recount_attempts >= 3) {
      return NextResponse.json(
        { error: "Maximum recount attempts reached. Admin unlock required." },
        { status: 409 }
      );
    }

    const isOpen = session.status === "OPEN";
    const previousValue = isOpen ? (count.opening_qty ?? 0) : (count.closing_qty ?? 0);
    const attemptNumber = count.recount_attempts + 1;

    // Update qty field and increment recount_attempts
    const updateField = isOpen ? { opening_qty: new_qty } : { closing_qty: new_qty };
    const { data: updated, error: updateErr } = await supabase
      .from("cash_session_counts")
      .update({
        ...updateField,
        recount_attempts: attemptNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", count_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Insert audit record
    const { error: auditErr } = await supabase
      .from("cash_session_recounts")
      .insert({
        session_id: sessionId,
        type: "ITEM",
        count_id,
        attempt_number: attemptNumber,
        previous_value: previousValue,
        new_value: new_qty,
        recounted_by_id,
        recounted_at: new Date().toISOString(),
      });

    if (auditErr) throw auditErr;

    return NextResponse.json({ count: updated });
  } catch (err) {
    console.error("[cash-sessions/[id]/counts PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
