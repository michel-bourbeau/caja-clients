import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Contact, UpdateContactInput } from "@/lib/types/contacts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; contactId: string }> }
) {
  try {
    const { tenantId, contactId } = await params;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data as Contact);
  } catch (err) {
    console.error("GET /contacts/:id error:", err);
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; contactId: string }> }
) {
  try {
    const { tenantId, contactId } = await params;
    const body: UpdateContactInput = await request.json();

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.full_name !== undefined) updates.full_name = body.full_name.trim();
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.phone_number !== undefined) updates.phone_number = body.phone_number?.trim() || null;
    if (body.whatsapp_number !== undefined) updates.whatsapp_number = body.whatsapp_number?.trim() || null;
    if (body.company_name !== undefined) updates.company_name = body.company_name?.trim() || null;
    if (body.address !== undefined) updates.address = body.address?.trim() || null;
    if (body.city !== undefined) updates.city = body.city?.trim() || null;
    if (body.country !== undefined) updates.country = body.country?.trim() || null;
    if (body.postal_code !== undefined) updates.postal_code = body.postal_code?.trim() || null;
    if (body.position !== undefined) updates.position = body.position?.trim() || null;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.google_maps_link !== undefined) updates.google_maps_link = body.google_maps_link?.trim() || null;
    if (body.photo_url !== undefined) updates.photo_url = body.photo_url?.trim() || null;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", contactId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data as Contact);
  } catch (err) {
    console.error("PUT /contacts/:id error:", err);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; contactId: string }> }
) {
  try {
    const { tenantId, contactId } = await params;

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from("contacts")
      .update({ is_active: false })
      .eq("id", contactId)
      .eq("tenant_id", tenantId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /contacts/:id error:", err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
