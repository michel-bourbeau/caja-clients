import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();
    const userId = request.headers.get("x-user-id");

    const isValidUUID = (id: string | null): boolean => {
      if (!id) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    const validUserId: string | null = isValidUUID(userId) ? userId : null;
    let canViewAll = false;

    if (validUserId) {
      // 1. Try custom users table
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("permissions, role_id")
        .eq("id", validUserId)
        .maybeSingle();

      let roleId: string | null = null;
      let directPerms: string[] = [];

      if (userData) {
        directPerms = userData.permissions || [];
        roleId = userData.role_id;
      } else {
        // 2. Fallback: resolve via Supabase auth email → employees table
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(validUserId);
        if (authUser?.user?.email) {
          const { data: emp } = await supabaseAdmin
            .from("employees")
            .select("role_id")
            .eq("email", authUser.user.email)
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (emp) roleId = emp.role_id;
        }
      }

      // Resolve canViewAll from direct perms or role
      if (directPerms.includes("expenses.view_all")) {
        canViewAll = true;
      } else if (roleId === "admin" || roleId === "superadmin") {
        canViewAll = true;
      } else if (roleId && isValidUUID(roleId)) {
        const { data: roleData } = await supabaseAdmin
          .from("tenant_roles")
          .select("slug, permissions")
          .eq("id", roleId)
          .maybeSingle();
        if (roleData) {
          const rolePerms: string[] = roleData.permissions || [];
          canViewAll =
            roleData.slug === "admin" ||
            roleData.slug === "superadmin" ||
            rolePerms.includes("expenses.view_all");
        }
      }
    }

    // Build query — always scope to tenant
    let query = supabaseAdmin
      .from("expenses")
      .select("*, suppliers(id, name), users(id, email)")
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false });

    // Non-admins without view_all can only see their own expenses
    if (!canViewAll && validUserId) {
      query = query.eq("created_by", validUserId);
    } else if (!canViewAll && !validUserId) {
      return NextResponse.json([]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /expenses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const userId = request.headers.get("x-user-id");

    // Validate UUID format (simple check)
    const isValidUUID = (id: string | null): boolean => {
      if (!id) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    const {
      supplier_id,
      amount,
      description,
      category,
      expense_date,
      is_recurring,
      recurring_frequency,
      recurring_day_of_month,
      notes,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify or find a valid user for created_by
    let validUserId: string | null = isValidUUID(userId) ? userId : null;
    
    // If no valid UUID provided, or user doesn't exist, try to find an employee
    if (validUserId) {
      const { data: userExists } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", validUserId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (userExists) {
        // User exists, we're good
      } else {
        // User doesn't exist, try to find employee
        validUserId = null;
      }
    }

    // If we still don't have a valid user, try to find an employee in this tenant
    if (!validUserId) {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("id, email, first_name, last_name")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();

      if (employee) {
        // Check if there's already a user with this email
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", employee.email)
          .maybeSingle();

        if (existingUser) {
          validUserId = existingUser.id;
        } else {
          // Create a user entry for this employee
          const { data: newUser, error: userError } = await supabaseAdmin
            .from("users")
            .insert([
              {
                tenant_id: tenantId,
                email: employee.email,
                first_name: employee.first_name,
                last_name: employee.last_name,
                status: "ACTIVE",
              }
            ])
            .select("id")
            .single();

          if (newUser) {
            validUserId = newUser.id;
          } else if (userError) {
            console.error("Error creating user for employee:", userError);
          }
        }
      }
    }

    // Try to insert with new fields first
    let expenseData: any = {
      tenant_id: tenantId,
      supplier_id: supplier_id || null,
      created_by: validUserId || null,
      amount,
      description,
      category,
      expense_date,
      is_recurring: is_recurring || false,
      recurring_day_of_month: recurring_day_of_month || null,
      notes,
      status: "RECORDED",
    };

    // Include recurring_frequency if migration has been applied
    if (recurring_frequency) {
      expenseData.recurring_frequency = recurring_frequency;
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert([expenseData])
      .select()
      .single();

    if (error) {
      console.error("Error creating expense:", error);
      
      // If the error is about recurring_frequency column not existing, try without it
      if (error.message?.includes("recurring_frequency") || error.code === "42703") {

        
        const expenseDataWithoutNewField = {
          tenant_id: tenantId,
          supplier_id: supplier_id || null,
          created_by: validUserId || null,
          amount,
          description,
          category,
          expense_date,
          is_recurring: is_recurring || false,
          recurring_day_of_month: recurring_day_of_month || null,
          notes,
          status: "RECORDED",
        };

        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from("expenses")
          .insert([expenseDataWithoutNewField])
          .select()
          .single();

        if (fallbackError) {
          console.error("Error creating expense (fallback):", fallbackError);
          throw fallbackError;
        }

        return NextResponse.json(fallbackData);
      }

      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Exception in POST /expenses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
