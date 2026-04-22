import { calculateTax, calculateTotal } from '@/features/pos/utils/calculations';

describe('POS Calculations', () => {
  describe('calculateTax', () => {
    it('should calculate tax correctly with standard rate', () => {
      // Assuming TAX_RATE is 0.21 (21%)
      const subtotal = 100;
      const tax = calculateTax(subtotal);
      
      // Should round to 2 decimals: 100 * 0.21 = 21.00
      expect(tax).toBe(21);
    });

    it('should round tax to 2 decimals', () => {
      const subtotal = 99.99;
      const tax = calculateTax(subtotal);
      
      // 99.99 * 0.21 = 20.9979, should round to 21.00
      expect(Number.isFinite(tax)).toBe(true);
      const decimalPart = tax.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });

    it('should handle zero subtotal', () => {
      const tax = calculateTax(0);
      expect(tax).toBe(0);
    });

    it('should handle small amounts', () => {
      const tax = calculateTax(1);
      expect(tax).toBeCloseTo(0.21, 2);
    });

    it('should handle large amounts', () => {
      const subtotal = 10000;
      const tax = calculateTax(subtotal);
      
      expect(tax).toBe(2100);
    });
  });

  describe('calculateTotal', () => {
    it('should return correct structure', () => {
      const subtotal = 100;
      const result = calculateTotal(subtotal);

      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('tax');
      expect(result).toHaveProperty('total');
    });

    it('should calculate total with subtotal 100', () => {
      const subtotal = 100;
      const result = calculateTotal(subtotal);

      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(21); // 100 * 0.21
      expect(result.total).toBe(121); // 100 + 21
    });

    it('should round total to 2 decimals', () => {
      const subtotal = 99.99;
      const result = calculateTotal(subtotal);

      expect(result.subtotal).toBe(99.99);
      expect(Number.isFinite(result.tax)).toBe(true);
      expect(Number.isFinite(result.total)).toBe(true);
      const decimalPart = result.total.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });

    it('should handle zero subtotal', () => {
      const result = calculateTotal(0);

      expect(result).toEqual({
        subtotal: 0,
        tax: 0,
        total: 0,
      });
    });

    it('should calculate correct total for various amounts', () => {
      const testCases = [
        { subtotal: 50, expectedTax: 10.5, expectedTotal: 60.5 },
        { subtotal: 200, expectedTax: 42, expectedTotal: 242 },
        { subtotal: 1000, expectedTax: 210, expectedTotal: 1210 },
      ];

      testCases.forEach(({ subtotal, expectedTax, expectedTotal }) => {
        const result = calculateTotal(subtotal);
        expect(result.tax).toBeCloseTo(expectedTax, 1);
        expect(result.total).toBeCloseTo(expectedTotal, 1);
      });
    });

    it('should maintain precision through calculation', () => {
      const subtotal = 75.25;
      const result = calculateTotal(subtotal);

      // Verify: 75.25 * 0.21 = 15.8025 ≈ 15.80
      // Total: 75.25 + 15.80 = 91.05
      expect(result.subtotal).toBe(75.25);
      expect(result.total).toBeCloseTo(91.05, 1);
    });
  });

  describe('Edge cases', () => {
    it('should handle negative subtotal (edge case)', () => {
      const result = calculateTotal(-100);
      
      expect(result.subtotal).toBe(-100);
      expect(result.tax).toBe(-21); // Negative tax
      expect(result.total).toBe(-121);
    });

    it('should handle very small decimals', () => {
      const result = calculateTotal(0.01);
      
      expect(result.subtotal).toBe(0.01);
      expect(Number.isFinite(result.total)).toBe(true);
    });

    it('should handle amounts with many decimals', () => {
      const result = calculateTotal(123.456789);
      
      expect(result.subtotal).toBe(123.456789);
      expect(Number.isFinite(result.tax)).toBe(true);
      expect(Number.isFinite(result.total)).toBe(true);
    });
  });
});
