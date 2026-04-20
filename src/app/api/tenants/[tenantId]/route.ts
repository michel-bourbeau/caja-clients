// src/app/api/tenants/[tenantId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { TenantService } from "@/features/tenants/services";

/**
 * GET /api/tenants/[tenantId]
 * Get tenant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const tenant = await TenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenants/[tenantId]
 * Update tenant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // TODO: Add authentication check

    const { tenantId } = await params;
    const body = await request.json();

    const tenant = await TenantService.updateTenant(tenantId, body);

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[tenantId]
 * Delete tenant (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // TODO: Add authentication check

    const { tenantId } = await params;
    await TenantService.deleteTenant(tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
