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

    // Get all purchases for this customer
    const { data: purchases, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('loyal_customer_id', customerId)
      .order('purchase_date', { ascending: false });

    if (error) throw error;

    // For each purchase, try to get the full transaction details if available
    let enrichedPurchases = purchases || [];

    if (enrichedPurchases.length > 0) {
      // Get transaction IDs that are not null
      const validTransactionIds = enrichedPurchases
        .filter((p: any) => p.transaction_id)
        .map((p: any) => p.transaction_id);

      if (validTransactionIds.length > 0) {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('id, items, payment_method, cashier_name, tax, discount, total')
          .in('id', validTransactionIds)
          .eq('tenant_id', tenantId);

        if (!txError && transactions) {
          // Create a map of transaction details
          const txMap = new Map();
          transactions.forEach((tx: any) => {
            txMap.set(tx.id, tx);
          });

          // Merge transaction details with purchase data
          enrichedPurchases = enrichedPurchases.map((purchase: any) => ({
            ...purchase,
            transactionDetails: purchase.transaction_id ? txMap.get(purchase.transaction_id) : null,
          }));
        }
      }
    }

    return NextResponse.json(enrichedPurchases);
  } catch (error: any) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
