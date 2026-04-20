// src/app/api/tenants/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { TenantService } from "@/features/tenants/services";

/**
 * GET /api/tenants
 * List all tenants (admin only)
 */
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Verify admin access
    // TODO: Add authentication check

    const tenants = await TenantService.getAllTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants
 * Create new tenant
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check

    const body = await request.json();
    const { name, slug, plan } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug" },
        { status: 400 }
      );
    }

    const tenant = await TenantService.createTenant(name, slug, plan);

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
