import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const search = request.nextUrl.searchParams.get('search');

    let query = supabase
      .from('loyal_customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,card_number.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching loyal customers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const { card_number, name, phone, email } = body;

    if (!card_number || !name) {
      return NextResponse.json(
        { error: 'Card number and name are required' },
        { status: 400 }
      );
    }

    // Check if card number already exists in this tenant
    const { data: existing } = await supabase
      .from('loyal_customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('card_number', card_number)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Card number already exists' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('loyal_customers')
      .insert({
        tenant_id: tenantId,
        card_number,
        name,
        phone,
        email,
        total_accumulated: 0,
        total_visits: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating loyal customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
