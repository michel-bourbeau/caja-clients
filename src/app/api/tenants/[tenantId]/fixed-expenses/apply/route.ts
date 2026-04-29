import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/tenants/[tenantId]/fixed-expenses/apply
 * Body: { year: number, month: number }  (month is 1-indexed)
 *
 * For each active fixed expense, checks if an expense entry already exists
 * for that month (via fixed_expense_id). If not, creates one.
 * Returns { created: number, skipped: number }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const userId = request.headers.get("x-user-id");
    const supabaseAdmin = getSupabaseAdmin();

    const year = parseInt(body.year);
    const month = parseInt(body.month); // 1-indexed

    if (!year || month < 1 || month > 12) {
      return NextResponse.json({ error: "Año y mes inválidos" }, { status: 400 });
    }

    // Resolve a valid created_by UUID for the tenant
    const isValidUUID = (id: string | null): boolean => {
      if (!id) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    let validUserId: string | null = isValidUUID(userId) ? userId : null;

    if (validUserId) {
      const { data: userExists } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", validUserId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!userExists) validUserId = null;
    }

    if (!validUserId) {
      const { data: anyUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (anyUser) validUserId = anyUser.id;
    }

    if (!validUserId) {
      return NextResponse.json(
        { error: "No se encontró un usuario válido para crear las entradas" },
        { status: 400 }
      );
    }

    // Load all active fixed expenses for this tenant
    const { data: fixedList, error: fixedError } = await supabaseAdmin
      .from("fixed_expenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (fixedError) {
      if ((fixedError as any).code === "PGRST205" || (fixedError as any).code === "42P01") {
        return NextResponse.json({ created: 0, skipped: 0, message: "Tabla no creada aún. Ejecute la migración en Supabase." });
      }
      throw fixedError;
    }
    if (!fixedList || fixedList.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, message: "No hay gastos fijos activos" });
    }

    const fixedIds = fixedList.map((f) => f.id);

    // Check which fixed expenses already have an entry this month
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("expenses")
      .select("fixed_expense_id")
      .eq("tenant_id", tenantId)
      .in("fixed_expense_id", fixedIds)
      .gte("expense_date", monthStart)
      .lt("expense_date", monthEnd);

    if (existingError) throw existingError;

    const alreadyApplied = new Set((existing || []).map((e) => e.fixed_expense_id));

    // Clamp day_of_month to the last valid day of the month
    const daysInMonth = new Date(year, month, 0).getDate();

    const toInsert = fixedList
      .filter((f) => !alreadyApplied.has(f.id))
      .map((f) => {
        const day = Math.min(f.day_of_month, daysInMonth);
        const expenseDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          tenant_id: tenantId,
          created_by: validUserId,
          fixed_expense_id: f.id,
          amount: f.amount,
          description: f.name,
          category: f.category || null,
          supplier_id: f.supplier_id || null,
          expense_date: expenseDate,
          is_recurring: true,
          recurring_frequency: "monthly",
          recurring_day_of_month: f.day_of_month,
          notes: f.notes || null,
          status: "RECORDED",
        };
      });

    const skipped = alreadyApplied.size;

    if (toInsert.length === 0) {
      return NextResponse.json({ created: 0, skipped, message: "Todos los gastos fijos ya fueron aplicados este mes" });
    }

    const { error: insertError } = await supabaseAdmin.from("expenses").insert(toInsert);
    if (insertError) throw insertError;

    return NextResponse.json({ created: toInsert.length, skipped });
  } catch (error) {
    console.error("Error in POST /fixed-expenses/apply:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
