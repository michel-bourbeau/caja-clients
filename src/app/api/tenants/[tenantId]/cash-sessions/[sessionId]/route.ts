import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET    /api/tenants/[tenantId]/cash-sessions/[sessionId]
 * PATCH  /api/tenants/[tenantId]/cash-sessions/[sessionId]
 *   Body: { notes?, resolved? }
 * DELETE /api/tenants/[tenantId]/cash-sessions/[sessionId]
 *   Only allowed if session is OPEN (safety guard — closing handled via /close)
 */

type Params = { params: Promise<{ tenantId: string; sessionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("cash_sessions")
      .select(
        `
        *,
        opened_by:employees!cash_sessions_opened_by_id_fkey(id, first_name, last_name),
        closed_by:employees!cash_sessions_closed_by_id_fkey(id, first_name, last_name),
        cash_session_employees(employee_id, employees(id, first_name, last_name)),
        cash_session_counts(*),
        cash_session_recounts(* , recounted_by:employees!cash_session_recounts_recounted_by_id_fkey(id, first_name, last_name))
        `
      )
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("[cash-sessions/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const body = await request.json();

    // Only allow updating metadata fields (not status — that goes through /close)
    const allowed = ["notes", "resolved"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("cash_sessions")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("[cash-sessions/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, sessionId } = await params;
    const supabase = getSupabaseAdmin();

    // Safety: only allow deletion of OPEN sessions (closed sessions are audit records)
    const { data: existing, error: fetchErr } = await supabase
      .from("cash_sessions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      throw fetchErr;
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { error: "Closed sessions cannot be deleted (audit record)" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("cash_sessions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", sessionId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cash-sessions/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
