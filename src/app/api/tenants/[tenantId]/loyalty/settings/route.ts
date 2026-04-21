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

    // Get or create loyalty settings for tenant
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Default settings if not found
    const defaultSettings = {
      tenant_id: tenantId,
      loyalty_module_enabled: false,
      loyalty_reward_threshold: 2000,
      loyalty_reward_type: 'DISCOUNT_PERCENT',
      loyalty_reward_value: 10,
    };

    const result = settings || defaultSettings;

    return NextResponse.json({
      loyalty_module_enabled: result.loyalty_module_enabled || false,
      loyalty_reward_threshold: result.loyalty_reward_threshold || 2000,
      loyalty_reward_type: result.loyalty_reward_type || 'DISCOUNT_PERCENT',
      loyalty_reward_value: result.loyalty_reward_value || 10,
    });
  } catch (error: any) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json({
      loyalty_module_enabled: false,
      loyalty_reward_threshold: 2000,
      loyalty_reward_type: 'DISCOUNT_PERCENT',
      loyalty_reward_value: 10,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        loyalty_module_enabled: body.loyalty_module_enabled,
        loyalty_reward_threshold: body.loyalty_reward_threshold,
        loyalty_reward_type: body.loyalty_reward_type,
        loyalty_reward_value: body.loyalty_reward_value,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating loyalty settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
