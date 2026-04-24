// src/app/api/tenants/[tenantId]/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_PAYROLL_CONFIG = { frequency: "weekly", weekStartDay: 1, monthStartDay: 1 };

function toClient(row: Record<string, unknown>) {
  return {
    tenantId:         row.tenant_id,
    companyName:      row.company_name      ?? "",
    companyPhone:     row.company_phone     ?? "",
    companyEmail:     row.company_email     ?? "",
    companyWebsite:   row.company_website   ?? "",
    companyRuc:       row.company_ruc       ?? "",
    currency:         row.currency          ?? "NIO",
    timezone:         row.timezone          ?? "America/Managua",
    language:         row.language          ?? "es",
    taxRate:          row.tax_rate          ?? 0,
    posConfig:        row.pos_config        ?? { roundTotal: false, printReceipt: true },
    payrollConfig:    row.payroll_config    ?? DEFAULT_PAYROLL_CONFIG,
    themeColor:       row.theme_color       ?? "slate",
    fontSize:         row.font_size         ?? "normal",
    logoUrl:          row.logo_url,
    usdExchangeRate:  row.usd_exchange_rate ?? 37.00,
    updatedAt:        row.updated_at,
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
    if (body.companyName       !== undefined) row.company_name        = body.companyName;
    if (body.companyPhone      !== undefined) row.company_phone       = body.companyPhone;
    if (body.companyEmail      !== undefined) row.company_email       = body.companyEmail;
    if (body.companyWebsite    !== undefined) row.company_website     = body.companyWebsite;
    if (body.companyRuc        !== undefined) row.company_ruc         = body.companyRuc;
    if (body.currency          !== undefined) row.currency            = body.currency;
    if (body.timezone          !== undefined) row.timezone            = body.timezone;
    if (body.language          !== undefined) row.language            = body.language;
    if (body.taxRate           !== undefined) row.tax_rate            = body.taxRate;
    if (body.posConfig         !== undefined) row.pos_config          = body.posConfig;
    if (body.payrollConfig     !== undefined) row.payroll_config      = body.payrollConfig;
    if (body.theme_color       !== undefined) row.theme_color         = body.theme_color;
    if (body.font_size         !== undefined) row.font_size           = body.font_size;
    if (body.logo_url          !== undefined) row.logo_url            = body.logo_url;
    if (body.usdExchangeRate   !== undefined) row.usd_exchange_rate   = body.usdExchangeRate;

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

/**
 * PATCH /api/tenants/[tenantId]/settings
 * Partial update for theme customization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.theme_color       !== undefined) row.theme_color       = body.theme_color;
    if (body.font_size         !== undefined) row.font_size         = body.font_size;
    if (body.logo_url          !== undefined) row.logo_url          = body.logo_url;
    if (body.usdExchangeRate   !== undefined) row.usd_exchange_rate  = body.usdExchangeRate;

    const { data, error } = await supabase
      .from("tenant_settings")
      .update(row)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(toClient(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
