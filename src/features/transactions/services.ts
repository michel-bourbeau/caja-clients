import { Transaction, CartItem } from "@/lib/types";

function mapTransaction(tx: any): Transaction {
  return {
    id: tx.id,
    items: tx.items || [],
    subtotal: tx.subtotal,
    discount: tx.discount,
    tax: tx.tax,
    total: tx.total,
    paymentMethod: tx.payment_method || "CASH",
    timestamp: tx.created_at ? new Date(tx.created_at) : new Date(),
    cashierId: tx.cashier_id || "unknown",
    cashierName: tx.cashier_name || "Admin",
    status: tx.status || "COMPLETED",
    amount_received: tx.amount_received || 0,
    change: tx.change || 0,
    cash_closing_id: tx.cash_closing_id || undefined,
  };
}

export const TransactionService = {
  async fetchTransactions(tenantId: string, from?: string, to?: string): Promise<Transaction[]> {
    let url = `/api/tenants/${tenantId}/transactions`;
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(mapTransaction) : [];
  },

  async fetchTransactionsPaged(
    tenantId: string,
    from: string,
    to: string,
    page = 1,
    limit = 50
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const url = `/api/tenants/${tenantId}/transactions?from=${from}&to=${to}&page=${page}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    const result = await response.json();
    const rows: any[] = Array.isArray(result.data) ? result.data : [];
    return {
      transactions: rows.map(mapTransaction),
      total: typeof result.total === "number" ? result.total : 0,
    };
  },

  async fetchTransactionStats(
    tenantId: string,
    from: string,
    to: string
  ): Promise<{ count: number; amount: number; taxes: number; refundCount: number; refundAmount: number }> {
    const url = `/api/tenants/${tenantId}/transactions?from=${from}&to=${to}&stats=true`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction stats: ${response.statusText}`);
    }
    return response.json();
  },

  async fetchTransactionsAll(
    tenantId: string,
    from: string,
    to: string
  ): Promise<Transaction[]> {
    const BATCH = 200;
    let page = 1;
    let all: Transaction[] = [];
    while (true) {
      const url = `/api/tenants/${tenantId}/transactions?from=${from}&to=${to}&page=${page}&limit=${BATCH}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      const result = await response.json();
      const rows: any[] = Array.isArray(result.data) ? result.data : [];
      const total: number = typeof result.total === "number" ? result.total : 0;
      all = [...all, ...rows.map(mapTransaction)];
      if (all.length >= total || rows.length === 0) break;
      page++;
    }
    return all;
  },

  async createTransaction(
    tenantId: string,
    items: CartItem[],
    paymentMethod: "CASH" | "CARD" | "TRANSFER",
    cashierId: string = "unknown",
    discount: number = 0
  ): Promise<Transaction> {
    const response = await fetch(`/api/tenants/${tenantId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        paymentMethod,
        cashierId,
        discount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create transaction");
    }

    const data = await response.json();
    return {
      id: data.id,
      items: data.items || [],
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.payment_method || "CASH",
      timestamp: data.created_at ? new Date(data.created_at) : new Date(),
      cashierId: data.cashier_id || "unknown",
      cashierName: data.cashier_name || "Unknown",
      status: data.status || "COMPLETED",
      amount_received: data.amount_received || 0,
      change: data.change || 0,
    };
  },

  async deleteTransaction(tenantId: string, transactionId: string): Promise<void> {
    const response = await fetch(
      `/api/tenants/${tenantId}/transactions/${transactionId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete transaction");
    }
  },

  async updateTransaction(
    tenantId: string,
    transactionId: string,
    updates: { payment_method?: string; created_at?: string; amount_received?: number; change?: number }
  ): Promise<Transaction> {
    const response = await fetch(
      `/api/tenants/${tenantId}/transactions/${transactionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update transaction");
    }

    const data = await response.json();
    return {
      id: data.id,
      items: data.items || [],
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.payment_method || "CASH",
      timestamp: data.created_at ? new Date(data.created_at) : new Date(),
      cashierId: data.cashier_id || "unknown",
      cashierName: data.cashier_name || "Unknown",
      status: data.status || "COMPLETED",
      amount_received: data.amount_received || 0,
      change: data.change || 0,
    };
  },
};
