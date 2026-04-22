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
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("permissions")
      .eq("id", userId)
      .single();

    const userPermissions = userData?.permissions || [];
    const canViewAll = userPermissions.includes("expenses.view_all");

    // Build query
    let query = supabaseAdmin
      .from("expenses")
      .select("*, suppliers(id, name), users(id, email)")
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false });

    // If user doesn't have view_all permission, only show their expenses
    if (!canViewAll) {
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
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

    // Try to insert with new fields first
    let expenseData: any = {
      tenant_id: tenantId,
      supplier_id: supplier_id || null,
      created_by: userId,
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
        console.log("recurring_frequency column not found, retrying without it...");
        
        // Remove the field that doesn't exist
        const expenseDataWithoutNewField = {
          tenant_id: tenantId,
          supplier_id: supplier_id || null,
          created_by: userId,
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
