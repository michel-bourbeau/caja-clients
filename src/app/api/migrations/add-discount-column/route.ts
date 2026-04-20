import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Migration endpoint to add discount column to transactions table
 * This should only be called once during setup
 * 
 * POST /api/migrations/add-discount-column
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Check if discount column already exists by attempting to query it
    const { error: checkError, data: checkData } = await supabaseAdmin
      .from("transactions")
      .select("discount")
      .limit(1);

    if (!checkError && checkData) {
      return NextResponse.json(
        { message: "Discount column already exists" },
        { status: 200 }
      );
    }

    // Run the migration SQL
    const { data, error } = await supabaseAdmin.rpc("exec_sql", {
      sql: `ALTER TABLE transactions ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0 NOT NULL;`,
    });

    if (error) {
      console.error("[Migration] Error adding discount column:", error);
      throw error;
    }

    return NextResponse.json(
      { message: "Discount column added successfully to transactions table" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Migration] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
