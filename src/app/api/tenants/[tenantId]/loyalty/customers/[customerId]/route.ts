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

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('loyal_customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get rewards to count how many tranches have been awarded
    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('loyal_customer_id', customerId)
      .order('reward_date', { ascending: false });

    // Calculate current counter: total_accumulated - (number_of_rewards × threshold)
    // Get loyalty settings for threshold
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('loyalty_reward_threshold')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const rewardThreshold = settings?.loyalty_reward_threshold || 2000;
    const numberOfRewards = rewards?.length || 0;
    const totalRewardedAmount = numberOfRewards * rewardThreshold;
    const currentCounter = Math.max(0, customer.total_accumulated - totalRewardedAmount);
    
    const lastReward = rewards?.[0];

    return NextResponse.json({
      ...customer,
      current_counter: currentCounter,
      last_reward_date: lastReward?.reward_date,
      rewards: rewards || [],
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; customerId: string }> }
) {
  try {
    const { tenantId, customerId } = await params;
    const body = await request.json();

    // Verify customer exists
    const { data: customer } = await supabase
      .from('loyal_customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('loyal_customers')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; customerId: string }> }
) {
  try {
    const { tenantId, customerId } = await params;

    // Verify customer exists
    const { data: customer } = await supabase
      .from('loyal_customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('loyal_customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
