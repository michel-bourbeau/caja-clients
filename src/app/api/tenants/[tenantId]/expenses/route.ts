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

    // Get user permissions to determine what they can see
    let userPermissions: string[] = [];
    let validUserId = userId;
    let userRoleId: string | null = null;

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("permissions, id, role_id")
      .eq("id", userId)
      .single();

    if (userData) {
      userPermissions = userData.permissions || [];
      validUserId = userData.id;
      userRoleId = userData.role_id;

    } else {
      // User not found, check if there's an employee that corresponds

      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("id, email, role_id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .single();

      if (employee) {
        // Check if a user exists for this employee email
        const { data: employeeUser } = await supabaseAdmin
          .from("users")
          .select("id, permissions, role_id")
          .eq("tenant_id", tenantId)
          .eq("email", employee.email)
          .single();

        if (employeeUser) {
          validUserId = employeeUser.id;
          userPermissions = employeeUser.permissions || [];
          userRoleId = employeeUser.role_id || employee.role_id;

        }
      }
    }

    // Admins always have view_all permission
    const canViewAll = userRoleId === "admin" || userPermissions.includes("expenses.view_all");


    // Build query
    let query = supabaseAdmin
      .from("expenses")
      .select("*, suppliers(id, name), users(id, email)")
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false });

    // If user doesn't have view_all permission, only show their expenses
    if (!canViewAll) {
      query = query.eq("created_by", validUserId);
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
    let validUserId = userId;
    if (userId) {
      const { data: userExists } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", userId)
        .eq("tenant_id", tenantId)
        .single();

      // If user doesn't exist, find any employee in this tenant and create/use their user entry
      if (!userExists) {

        const { data: employee } = await supabaseAdmin
          .from("employees")
          .select("id, email, first_name, last_name")
          .eq("tenant_id", tenantId)
          .limit(1)
          .single();

        if (employee) {

          
          // Check if there's already a user with this email
          const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("email", employee.email)
            .single();

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
