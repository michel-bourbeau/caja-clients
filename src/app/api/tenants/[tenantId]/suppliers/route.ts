import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const { name, description, contact } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre del proveedor es requerido" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .insert([
        {
          tenant_id: tenantId,
          name: name.trim(),
          description: description || null,
          contact: contact || null,
          status: "ACTIVE",
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.message?.includes("unique")) {
        return NextResponse.json(
          { error: "Este proveedor ya existe" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
