/**
 * Demo Mode — Tenant root endpoint
 * Handles GET /api/tenants/demo (no trailing path segments).
 * The [...path] catch-all only matches routes WITH at least one extra segment,
 * so this file is required to handle the bare tenant lookup.
 */

import { NextResponse } from "next/server";
import { DEMO_TENANT } from "@/lib/demo/mockData";

export function GET() {
  return NextResponse.json(DEMO_TENANT);
}
