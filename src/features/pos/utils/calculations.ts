// POS Calculation utilities

const TAX_RATE = 0.16; // 16% tax rate (adjustable)

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

/**
 * Calculate total including tax
 */
export function calculateTotal(subtotal: number): { tax: number; total: number } {
  const tax = calculateTax(subtotal);
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { tax, total };
}
