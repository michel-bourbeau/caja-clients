// src/app/api/tenants/[tenantId]/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/features/tenants/services";

/**
 * GET /api/tenants/[tenantId]/settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const settings = await TenantService.getTenantSettings(tenantId);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenants/[tenantId]/settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // TODO: Add authentication check

    const { tenantId } = await params;
    const body = await request.json();

    const settings = await TenantService.updateTenantSettings(
      tenantId,
      body
    );

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
