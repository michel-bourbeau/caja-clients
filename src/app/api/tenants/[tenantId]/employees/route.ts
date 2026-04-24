import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/employees
 * List all employees AND users (admins) for a tenant
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    // Get employees from the employees table
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("first_name", { ascending: true });

    if (empError) throw empError;

    // Get users (admins) from the users table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role_id, status, created_at")
      .eq("tenant_id", tenantId)
      .order("first_name", { ascending: true });

    if (usersError) throw usersError;

    // Convert users to employee format for compatibility
    const usersAsEmployees = (users || []).map((u) => ({
      id: u.id,
      tenant_id: tenantId,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: null,
      role_id: u.role_id || "admin", // Default to "admin" if null (system users are admins)
      salary: null,
      salary_type: null,
      hire_date: u.created_at?.split("T")[0] || null,
      status: u.status,
      created_at: u.created_at,
      is_system_user: true,
      is_principal_admin: u.role_id === "admin" || u.role_id === null, // Treat null as admin too
    }));

    // Deduplicate: remove employees with same email as system users
    const systemUserEmails = new Set(usersAsEmployees.map((u) => u.email));
    const uniqueEmployees = (employees || []).filter((e) => !systemUserEmails.has(e.email));

    // Combine and sort by name
    const combined = [...uniqueEmployees, ...usersAsEmployees].sort((a, b) =>
      (a.first_name || "").localeCompare(b.first_name || "")
    );

    return NextResponse.json(combined);
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
    const { firstName, lastName, email, phone, roleId, salary, salaryType, password, hireDate } = body;

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
          salary_type: salaryType || "hourly",
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
