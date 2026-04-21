import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/tenants/[tenantId]/employees/[employeeId]
 * Update an employee (name, salary, role, phone, status)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, roleId, salary, salaryType, status, password, hireDate } = body;

    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (firstName    !== undefined) updates.first_name = firstName.trim();
    if (lastName     !== undefined) updates.last_name  = lastName.trim();
    if (email        !== undefined) updates.email      = email.trim().toLowerCase();
    if (phone        !== undefined) updates.phone      = phone?.trim() || null;
    if (roleId       !== undefined) updates.role_id    = roleId;
    if (salary       !== undefined) updates.salary     = parseFloat(salary);
    if (salaryType   !== undefined) updates.salary_type = salaryType;
    if (status       !== undefined) updates.status     = status;
    if (hireDate     !== undefined) updates.hire_date  = hireDate || null;

    const { data, error } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    // Update password via Supabase Auth if provided
    if (password && email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(
        (u) => u.email === (email ?? data.email).trim().toLowerCase()
      );
      if (authUser) {
        await supabase.auth.admin.updateUserById(authUser.id, { password });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]/employees/[employeeId]
 * Delete an employee and optionally their auth account
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const supabase = getSupabaseAdmin();

    // Get employee email before deleting
    const { data: employee } = await supabase
      .from("employees")
      .select("email")
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .single();

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    // Also delete Supabase Auth user if they have one
    if (employee?.email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u) => u.email === employee.email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
