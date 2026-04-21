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
    const cardNumber = request.nextUrl.searchParams.get('card_number');

    if (!cardNumber) {
      return NextResponse.json(
        { error: 'card_number is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('loyal_customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('card_number', cardNumber)
      .single();

    // If no error and data exists, card number is taken
    if (!error && data) {
      return NextResponse.json({ available: false, message: 'Card number already exists' });
    }

    // If error is PGRST116 (no rows found), card number is available
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ available: true });
    }

    // Other errors
    if (error) throw error;

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Error checking card number:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
