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

    // Get the OLD email before updating
    const { data: oldEmployee } = await supabase
      .from("employees")
      .select("email")
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

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

    // If email was updated, also update in users table if a user exists
    if (email !== undefined && oldEmployee) {
      const oldEmail = oldEmployee.email;
      const newEmail = email.trim().toLowerCase();
      
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", oldEmail)
        .maybeSingle();

      if (existingUser) {
        // Update the user's email in users table
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ email: newEmail })
          .eq("id", existingUser.id)
          .eq("tenant_id", tenantId);

        if (userUpdateError) {
          console.error("Error updating user email:", userUpdateError);
        }

        // Also update in Supabase Auth if user exists there
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users?.find((u) => u.email === oldEmail);
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, { email: newEmail });
        }
      }
    }

    // Update password via Supabase Auth if provided
    if (password && data.email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(
        (u) => u.email === data.email.trim().toLowerCase()
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
 * Delete an employee (from employees table) or a system user (from users table)
 * Also deletes their Supabase Auth account if they have one
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; employeeId: string }> }
) {
  try {
    const { tenantId, employeeId } = await params;
    const supabase = getSupabaseAdmin();

    console.log(`[DELETE] Attempting to delete employee: ${employeeId} from tenant: ${tenantId}`);

    // First, try to delete from employees table
    const { data: employee, error: empLookupError } = await supabase
      .from("employees")
      .select("email")
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (empLookupError) {
      console.error("[DELETE] Employee lookup error:", empLookupError);
      if (empLookupError.code !== "PGRST116") throw empLookupError;
    }

    if (employee) {
      console.log(`[DELETE] Found employee in employees table: ${employee.email}`);
      // This is an employee record
      const { error: deleteError } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId)
        .eq("tenant_id", tenantId);

      if (deleteError) {
        console.error("[DELETE] Error deleting from employees table:", deleteError);
        throw deleteError;
      }

      // Delete their Supabase Auth account if they have one
      if (employee.email) {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users?.find((u) => u.email === employee.email);
          if (authUser) {
            console.log(`[DELETE] Deleting auth account for ${employee.email}`);
            await supabase.auth.admin.deleteUser(authUser.id);
          }
        } catch (authError) {
          console.error("[DELETE] Error deleting auth user:", authError);
          // Don't fail if auth deletion fails
        }
      }

      return NextResponse.json({ success: true });
    }

    // If not in employees table, try users table (system users created with tenant)
    const { data: user, error: userLookupError } = await supabase
      .from("users")
      .select("email")
      .eq("id", employeeId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (userLookupError) {
      console.error("[DELETE] User lookup error:", userLookupError);
      if (userLookupError.code !== "PGRST116") throw userLookupError;
    }

    if (user) {
      console.log(`[DELETE] Found user in users table: ${user.email}`);
      console.log(`[DELETE] User ID to delete: ${employeeId}`);
      
      // Get all users in this tenant
      const { data: allUsers, error: allUsersError } = await supabase
        .from("users")
        .select("id, email")
        .eq("tenant_id", tenantId);

      if (allUsersError) {
        console.error("[DELETE] Error fetching all users:", allUsersError);
      } else {
        console.log(`[DELETE] Found ${allUsers?.length || 0} users in tenant`);
        allUsers?.forEach((u) => console.log(`  - ${u.id}: ${u.email}`));
      }

      // Find another user to transfer references to
      const otherUsers = (allUsers || []).filter((u) => u.id !== employeeId);
      const transferUserId = otherUsers.length > 0 ? otherUsers[0].id : null;
      
      if (transferUserId) {
        console.log(`[DELETE] Will transfer references to: ${transferUserId}`);
        
        // Get the transfer target user's name
        const { data: transferUser } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", transferUserId)
          .maybeSingle();

        const transferUserName = transferUser
          ? `${transferUser.first_name} ${transferUser.last_name}`.trim()
          : "Admin";
        
        // Try to update expenses with created_by field
        const { data: updateResult, error: updateError } = await supabase
          .from("expenses")
          .update({ created_by: transferUserId })
          .eq("created_by", employeeId)
          .select("id");
        
        if (updateError) {
          console.error("[DELETE] Error updating expenses.created_by:", updateError.message);
        } else {
          console.log(`[DELETE] Updated ${updateResult?.length || 0} expenses records`);
        }

        // Update transactions cashier_name
        const { data: transactionResult, error: transactionError } = await supabase
          .from("transactions")
          .update({ cashier_name: transferUserName })
          .eq("cashier_id", employeeId)
          .select("id");

        if (transactionError) {
          console.error("[DELETE] Error updating transactions.cashier_name:", transactionError.message);
        } else {
          console.log(`[DELETE] Updated ${transactionResult?.length || 0} transaction records`);
        }
      } else {
        console.warn(`[DELETE] No other user found to transfer references to`);
      }

      // 1. Delete from users table
      console.log(`[DELETE] Attempting to delete user ${employeeId} from users table...`);
      const { error: deleteError, count } = await supabase
        .from("users")
        .delete()
        .eq("id", employeeId)
        .eq("tenant_id", tenantId);

      if (deleteError) {
        console.error("[DELETE] Error deleting from users table:", deleteError);
        throw deleteError;
      }
      
      console.log(`[DELETE] Successfully deleted from users table (${count} row)`);

      // 2. Delete their Supabase Auth account by email
      if (user.email) {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users?.find((u) => u.email === user.email);
          if (authUser) {
            console.log(`[DELETE] Deleting auth account for ${user.email}`);
            await supabase.auth.admin.deleteUser(authUser.id);
          }
        } catch (authError) {
          console.error("[DELETE] Error deleting auth user:", authError);
        }
      }

      return NextResponse.json({ success: true });
    }

    // User not found in either table
    console.warn(`[DELETE] User not found: ${employeeId} in tenant: ${tenantId}`);
    return NextResponse.json(
      { error: "Utilisateur introuvable" },
      { status: 404 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[DELETE] Unexpected error:", errorMsg, error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
