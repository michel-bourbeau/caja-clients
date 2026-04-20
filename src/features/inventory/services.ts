// Inventory Service - Handle inventory operations

import { Product, InventoryMovement } from "@/lib/types";

export class InventoryService {
  /**
   * Update product stock
   */
  static async updateStock(
    productId: string,
    quantity: number,
    reason: string
  ): Promise<InventoryMovement> {
    const movement: InventoryMovement = {
      id: this.generateMovementId(),
      productId,
      quantity,
      type: quantity > 0 ? "IN" : "OUT",
      reason,
      timestamp: new Date(),
      userId: "", // Will be set from context
    };

    // TODO: Send to API
    return movement;
  }

  /**
   * Check if product stock is low
   */
  static isLowStock(product: Product, threshold = 10): boolean {
    return product.quantity <= threshold;
  }

  /**
   * Get low stock products
   */
  static filterLowStockProducts(products: Product[], threshold = 10): Product[] {
    return products.filter((product) => this.isLowStock(product, threshold));
  }

  /**
   * Calculate stock value
   */
  static calculateInventoryValue(products: Product[]): number {
    return products.reduce((total, product) => total + product.price * product.quantity, 0);
  }

  /**
   * Generate unique movement ID
   */
  static generateMovementId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 9);
    return `MV-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Validate stock for sale
   */
  static validateStock(product: Product, quantity: number): { valid: boolean; error?: string } {
    if (quantity <= 0) {
      return { valid: false, error: "La cantidad debe ser mayor a 0" };
    }
    if (quantity > product.quantity) {
      return { valid: false, error: `Stock insuficiente. Disponible: ${product.quantity}` };
    }
    return { valid: true };
  }
}
