import { Transaction, CartItem } from "@/lib/types";

export const TransactionService = {
  async fetchTransactions(tenantId: string): Promise<Transaction[]> {
    const response = await fetch(`/api/tenants/${tenantId}/transactions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Get admin name for Unknown transactions
    let adminName = "Admin";
    try {
      const adminResponse = await fetch(`/api/tenants/${tenantId}/admin`);
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        if (adminData.first_name && adminData.last_name) {
          adminName = `${adminData.first_name} ${adminData.last_name}`.trim();
        }
      }
    } catch (error) {
      console.error("Failed to fetch admin name:", error);
    }
    
    // Map API response to Transaction type
    return Array.isArray(data)
      ? data.map((tx: any) => ({
          id: tx.id,
          items: tx.items || [],
          subtotal: tx.subtotal,
          discount: tx.discount,
          tax: tx.tax,
          total: tx.total,
          paymentMethod: tx.payment_method || "CASH",
          timestamp: tx.created_at ? new Date(tx.created_at) : new Date(),
          cashierId: tx.cashier_id || "unknown",
          cashierName: tx.cashier_name && tx.cashier_name !== "Unknown" ? tx.cashier_name : adminName,
          status: tx.status || "COMPLETED",
          amount_received: tx.amount_received || 0,
          change: tx.change || 0,
          cash_closing_id: tx.cash_closing_id || undefined,
        }))
      : [];
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
