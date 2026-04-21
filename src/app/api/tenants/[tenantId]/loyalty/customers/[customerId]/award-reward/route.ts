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

    console.log(`[award-reward] Starting for customer ${customerId}`);

    // Get customer to capture current total_accumulated at time of reward
    const { data: customer, error: customerError } = await supabase
      .from('loyal_customers')
      .select('*')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .single();

    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    console.log(`[award-reward] Current total_accumulated: ${customer.total_accumulated}`);

    // Get loyalty settings to get the reward threshold
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('loyalty_reward_threshold')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const rewardThreshold = settings?.loyalty_reward_threshold || 2000;
    console.log(`[award-reward] Reward threshold: ${rewardThreshold}`);

    // Create reward record with current accumulated amount
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
    console.log(`[award-reward] Reward created: ${reward.id}`);

    // Just update last_reward_date, do NOT subtract from total_accumulated
    // total_accumulated is the historical sum and should never decrease
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('loyal_customers')
      .update({
        last_reward_date: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error(`[award-reward] Update error:`, updateError);
      throw updateError;
    }

    console.log(`[award-reward] Customer updated successfully`, updatedCustomer);

    return NextResponse.json(
      {
        reward,
        updatedCustomer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`[award-reward] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
