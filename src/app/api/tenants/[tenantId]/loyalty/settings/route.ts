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
    // If columns don't exist yet, return defaults
    if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
      return NextResponse.json({
        loyalty_module_enabled: false,
        loyalty_reward_threshold: 2000,
        loyalty_reward_type: 'DISCOUNT_PERCENT',
        loyalty_reward_value: 10,
      });
    }
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



    const loyaltyData = {
      tenant_id: tenantId,
      loyalty_module_enabled: body.loyalty_module_enabled ?? false,
      loyalty_reward_threshold: body.loyalty_reward_threshold ?? 2000,
      loyalty_reward_type: body.loyalty_reward_type ?? 'DISCOUNT_PERCENT',
      loyalty_reward_value: body.loyalty_reward_value ?? 10,
      updated_at: new Date().toISOString(),
    };

    // Use upsert which automatically handles insert or update
    const { data, error } = await supabase
      .from('tenant_settings')
      .upsert(loyaltyData, {
        onConflict: 'tenant_id',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }


    return NextResponse.json(data || loyaltyData);
  } catch (error: any) {

    // If columns don't exist, provide helpful message
    if (error?.code === 'PGRST204' || error?.message?.includes('column')) {
      return NextResponse.json(
        { error: 'Columnas de loyalty aún no creadas en la base de datos. Por favor ejecuta la migración en Supabase SQL Editor.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
