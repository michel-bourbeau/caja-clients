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

    // Verify customer exists in tenant
    const { data: customer } = await supabase
      .from('loyal_customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: purchases, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('loyal_customer_id', customerId)
      .order('purchase_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(purchases || []);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
