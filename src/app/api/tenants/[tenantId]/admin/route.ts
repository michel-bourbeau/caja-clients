import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    // Get the principal admin for the tenant
    const { data: admin, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role_id")
      .eq("tenant_id", tenantId)
      .eq("role_id", "admin")
      .maybeSingle();

    if (error) {
      console.error("[GET /admin] Error fetching admin:", error);
      return NextResponse.json(
        { error: "Failed to fetch admin" },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "No admin found for tenant" },
        { status: 404 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("[GET /admin] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
