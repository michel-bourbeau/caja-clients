import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; customerId: string }> }
) {
  try {
    const { tenantId, customerId } = await params;
    const body = await request.json();

    const { reward_type, reward_value, notes } = body;

    if (!reward_type) {
      return NextResponse.json(
        { error: 'Reward type is required' },
        { status: 400 }
      );
    }

    // Get customer to capture current total_accumulated at time of reward
    const { data: customer, error: customerError } = await supabase
      .from('loyal_customers')
      .select('total_accumulated')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create reward record
    const { data: reward, error: rewardError } = await supabase
      .from('loyalty_rewards')
      .insert({
        loyal_customer_id: customerId,
        reward_date: new Date().toISOString(),
        amount_at_reward: customer.total_accumulated,
        reward_type,
        reward_value,
        notes,
      })
      .select()
      .single();

    if (rewardError) throw rewardError;

    return NextResponse.json(reward, { status: 201 });
  } catch (error: any) {
    console.error('Error awarding reward:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
