import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/auth/profile?email=xxx
 * Resolve employee/user profile server-side (admin client, bypasses RLS).
 * Returns: { first_name, last_name, role_id, tenant_id, direct_permissions }
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 1. Try employees table first
  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("first_name, last_name, role_id, tenant_id")
    .eq("email", email)
    .maybeSingle();

  if (empError) {
    console.error("[profile] employees lookup error:", empError.message);
  }

  if (emp) {
    return NextResponse.json({ ...emp, direct_permissions: null });
  }

  // 2. Fallback to users table
  const { data: usr, error: usrError } = await supabase
    .from("users")
    .select("first_name, last_name, role_id, tenant_id, permissions")
    .eq("email", email)
    .maybeSingle();

  if (usrError) {
    console.error("[profile] users lookup error:", usrError.message);
  }

  if (usr) {
    return NextResponse.json({
      ...usr,
      direct_permissions: usr.permissions ?? null,
    });
  }

  return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
}
