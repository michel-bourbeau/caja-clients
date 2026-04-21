import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/attendance
 * Query params:
 *   fromDate  YYYY-MM-DD  (Nicaragua time, inclusive)
 *   toDate    YYYY-MM-DD  (Nicaragua time, inclusive)
 *   employeeId  (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const employeeId = searchParams.get("employeeId");

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("time_entries")
      .select("*, employees(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .order("check_in", { ascending: false });

    // Nicaragua is UTC-6. Convert local date boundaries to UTC for the query.
    // "fromDate 00:00 Nicaragua" = fromDate + "T06:00:00Z" (UTC)
    // "toDate 23:59:59 Nicaragua" = toDate + "T05:59:59Z" next day UTC
    if (fromDate) {
      query = query.gte("check_in", `${fromDate}T06:00:00Z`);
    }
    if (toDate) {
      // Add one day then subtract 1 second for end-of-day Nicaragua
      const next = new Date(`${toDate}T06:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.lt("check_in", next.toISOString());
    }
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten employee name into the entry
    const result = (data || []).map((row: any) => ({
      id:               row.id,
      tenant_id:        row.tenant_id,
      employee_id:      row.employee_id,
      employee_first_name: row.employees?.first_name ?? null,
      employee_last_name:  row.employees?.last_name  ?? null,
      check_in:         row.check_in,
      check_out:        row.check_out,
      notes:            row.notes,
      created_at:       row.created_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/attendance
 * Body: { employeeId, checkIn?: ISO string, checkOut?: ISO string, notes? }
 *
 * - If checkIn is omitted → real-time punch-in (uses now(), blocks if open entry exists)
 * - If checkIn is provided → manual entry (no open-entry check, allows multiple shifts)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { employeeId, checkIn, checkOut, notes } = await request.json();

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId es requerido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify employee belongs to tenant
    const { data: emp, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .single();

    if (empError || !emp) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Only block duplicate real-time check-in (not manual entries with explicit time)
    if (!checkIn) {
      const { data: open } = await supabase
        .from("time_entries")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .is("check_out", null)
        .maybeSingle();

      if (open) {
        return NextResponse.json(
          { error: "El empleado ya tiene una entrada activa. Debe registrar salida primero." },
          { status: 409 }
        );
      }
    }

    // Validate check_out is after check_in when both provided
    if (checkIn && checkOut) {
      if (new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
        return NextResponse.json(
          { error: "La hora de salida debe ser posterior a la entrada" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        tenant_id:   tenantId,
        employee_id: employeeId,
        check_in:    checkIn ?? new Date().toISOString(),
        check_out:   checkOut ?? null,
        notes:       notes ?? null,
      })
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
