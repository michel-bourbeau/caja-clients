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

    const { amount, transaction_id, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const { data: customer } = await supabase
      .from('loyal_customers')
      .select('total_accumulated, total_visits')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Record the transaction
    const { data: transaction, error: txError } = await supabase
      .from('loyalty_transactions')
      .insert({
        loyal_customer_id: customerId,
        transaction_id,
        amount,
        description,
        purchase_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    // Update customer totals
    const newAccumulated = customer.total_accumulated + amount;
    const newVisits = customer.total_visits + 1;

    const { error: updateError } = await supabase
      .from('loyal_customers')
      .update({
        total_accumulated: newAccumulated,
        total_visits: newVisits,
        last_purchase_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error recording purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
