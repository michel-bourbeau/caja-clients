// POS Service - Handle sales operations

import { CartItem, Product, Transaction } from "@/lib/types";
import { calculateTotal } from "@/lib/utils/calculations";

const API_BASE = "/api/tenants";

export class POSService {
  /**
   * Fetch products for the current tenant
   */
  static async fetchProducts(tenantId: string): Promise<Product[]> {
    const response = await fetch(`${API_BASE}/${tenantId}/products`);
    if (!response.ok) {
      throw new Error("Impossible de charger les produits");
    }

    const data = (await response.json()) as any[];
    return data.map((product) => ({
      ...product,
      createdAt: new Date(product.created_at || product.createdAt),
      updatedAt: new Date(product.updated_at || product.updatedAt),
    }));
  }

  static async fetchTransactions(tenantId: string): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE}/${tenantId}/transactions`);
    if (!response.ok) {
      throw new Error("Impossible de charger les transactions");
    }

    const data = (await response.json()) as any[];
    return data.map((transaction) => ({
      ...transaction,
      timestamp: new Date(transaction.created_at || transaction.timestamp),
    }));
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(
    tenantId: string,
    items: CartItem[],
    paymentMethod: "CASH" | "CARD" | "TRANSFER",
    cashierId: string
  ): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/${tenantId}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items, paymentMethod, cashierId }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody?.error || "Erreur lors de la création de la transaction");
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.created_at || data.timestamp),
    };
  }

  /**
   * Calculate cart total
   */
  static calculateCartTotal(items: CartItem[]): { subtotal: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    return calculateTotal(subtotal);
  }

  /**
   * Generate unique transaction ID
   */
  static generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 9);
    return `TX-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Format receipt for printing
   */
  static formatReceipt(transaction: Transaction): string {
    const date = new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(transaction.timestamp);

    let receipt = `
╔════════════════════════════════════════════╗
║         COMPROBANTE DE VENTA               ║
╚════════════════════════════════════════════╝

Fecha: ${date}
Transacción ID: ${transaction.id}

────────────────────────────────────────────
PRODUCTOS
────────────────────────────────────────────
${transaction.items
      .map((item) => `${item.quantity}x $${item.price.toFixed(2)} = $${item.total.toFixed(2)}`)
      .join("\n")}

────────────────────────────────────────────
Subtotal: $${transaction.subtotal.toFixed(2)}
IVA (21%):  $${transaction.tax.toFixed(2)}
────────────────────────────────────────────
TOTAL:      $${transaction.total.toFixed(2)}
────────────────────────────────────────────

Método de Pago: ${transaction.paymentMethod}

Gracias por su compra
    `;

    return receipt;
  }
}
