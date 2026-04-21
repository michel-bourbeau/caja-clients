// src/app/api/tenants/[tenantId]/backup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/tenants/[tenantId]/backup
 * Export all tenant data as JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const [tenant, settings, products, employees, transactions] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("products").select("*").eq("tenant_id", tenantId).is("deleted_at", null),
      supabase.from("employees").select("*").eq("tenant_id", tenantId),
      supabase.from("transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(500),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      tenant: tenant.data ?? null,
      settings: settings.data ?? null,
      products: products.data ?? [],
      employees: employees.data ?? [],
      transactions: transactions.data ?? [],
      counts: {
        products: products.data?.length ?? 0,
        employees: employees.data?.length ?? 0,
        transactions: transactions.data?.length ?? 0,
      },
    };

    const tenantSlug = tenant.data?.slug ?? tenantId.slice(0, 8);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup-${tenantSlug}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generating backup" },
      { status: 500 }
    );
  }
}
