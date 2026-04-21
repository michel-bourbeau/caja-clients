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
        { error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current customer to update total_accumulated and total_visits
    const { data: customer, error: customerError } = await supabase
      .from('loyal_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Record the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        loyal_customer_id: customerId,
        amount,
        transaction_id,
        description,
        purchase_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update customer total_accumulated and total_visits
    const { error: updateError } = await supabase
      .from('loyal_customers')
      .update({
        total_accumulated: customer.total_accumulated + amount,
        total_visits: customer.total_visits + 1,
        last_purchase_date: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error recording purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
