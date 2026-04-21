import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; customerId: string }> }
) {
  try {
    const { tenantId, customerId } = await params;

    // Get all rewards for this customer
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('loyal_customer_id', customerId)
      .order('reward_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching reward history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
