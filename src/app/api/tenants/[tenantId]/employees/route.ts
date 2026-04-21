import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/employees
 * List all employees for a tenant
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("first_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[tenantId]/employees
 * Create a new employee, optionally with a Supabase Auth account (login/password)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, roleId, salary, password, hireDate } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Prénom, nom et email sont requis" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Create employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .insert([
        {
          tenant_id: tenantId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          role_id: roleId || "cashier",
          salary: salary ? parseFloat(salary) : 0,
          hire_date: hireDate || new Date().toISOString().split("T")[0],
          status: "ACTIVE",
        },
      ])
      .select()
      .single();

    if (empError) {
      if (empError.code === "23505") {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé par un autre employé" },
          { status: 409 }
        );
      }
      throw empError;
    }

    // If a password is provided, create a Supabase Auth user
    if (password) {
      const { error: authError } = await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        user_metadata: {
          tenant_id: tenantId,
          role_id: roleId || "cashier",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
        email_confirm: true,
      });

      if (authError && authError.message !== "User already registered") {
        // Auth user creation failed — rollback employee record
        await supabase.from("employees").delete().eq("id", employee.id);
        return NextResponse.json(
          { error: `Erreur création compte: ${authError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
