// src/app/api/tenants/[tenantId]/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/features/tenants/services";

/**
 * GET /api/tenants/[tenantId]/stats
 * Get tenant usage statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const stats = await TenantService.getTenantStats(tenantId);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
