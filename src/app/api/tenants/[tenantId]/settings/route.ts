// src/app/api/tenants/[tenantId]/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function toClient(row: Record<string, unknown>) {
  return {
    tenantId:        row.tenant_id,
    companyName:     row.company_name     ?? "",
    companyPhone:    row.company_phone    ?? "",
    companyEmail:    row.company_email    ?? "",
    companyWebsite:  row.company_website  ?? "",
    companyRuc:      row.company_ruc      ?? "",
    currency:        row.currency         ?? "NIO",
    timezone:        row.timezone         ?? "America/Managua",
    language:        row.language         ?? "es",
    taxRate:         row.tax_rate         ?? 0,
    posConfig:       row.pos_config       ?? { roundTotal: false, printReceipt: true },
    updatedAt:       row.updated_at,
  };
}

/**
 * GET /api/tenants/[tenantId]/settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) {
      return NextResponse.json(toClient({ tenant_id: tenantId }));
    }

    return NextResponse.json(toClient(data));
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
    const { tenantId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const row: Record<string, unknown> = { tenant_id: tenantId, updated_at: new Date().toISOString() };
    if (body.companyName    !== undefined) row.company_name    = body.companyName;
    if (body.companyPhone   !== undefined) row.company_phone   = body.companyPhone;
    if (body.companyEmail   !== undefined) row.company_email   = body.companyEmail;
    if (body.companyWebsite !== undefined) row.company_website = body.companyWebsite;
    if (body.companyRuc     !== undefined) row.company_ruc     = body.companyRuc;
    if (body.currency       !== undefined) row.currency        = body.currency;
    if (body.timezone       !== undefined) row.timezone        = body.timezone;
    if (body.language       !== undefined) row.language        = body.language;
    if (body.taxRate        !== undefined) row.tax_rate        = body.taxRate;
    if (body.posConfig      !== undefined) row.pos_config      = body.posConfig;

    const { data, error } = await supabase
      .from("tenant_settings")
      .upsert(row, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(toClient(data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
