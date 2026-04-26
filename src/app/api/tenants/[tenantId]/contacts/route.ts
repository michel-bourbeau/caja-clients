import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Contact, CreateContactInput, UpdateContactInput, ContactsResponse } from "@/lib/types/contacts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive") !== "false";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("is_active", isActive);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%,company_name.ilike.%${search}%`
      );
    }

    const offset = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const response: ContactsResponse = {
      contacts: data as Contact[],
      total: count || 0,
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /contacts error:", err);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body: CreateContactInput = await request.json();

    if (!body.full_name?.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        full_name: body.full_name.trim(),
        email: body.email?.trim() || null,
        phone_number: body.phone_number?.trim() || null,
        whatsapp_number: body.whatsapp_number?.trim() || null,
        company_name: body.company_name?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
        postal_code: body.postal_code?.trim() || null,
        position: body.position?.trim() || null,
        notes: body.notes?.trim() || null,
        google_maps_link: body.google_maps_link?.trim() || null,
        photo_url: body.photo_url?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data as Contact, { status: 201 });
  } catch (err) {
    console.error("POST /contacts error:", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
