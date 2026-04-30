import { InventoryService } from '@/features/inventory/services';
import { Product } from '@/lib/types';

describe('InventoryService', () => {
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    sku: 'TST-001',
    price: 100,
    cost_price: 50,
    quantity: 50,
    category: 'cat-1',
    description: 'A test product',
    min_stock: 10,
    sort_order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('isLowStock', () => {
    it('should return true if product quantity is at or below threshold', () => {
      const product: Product = { ...mockProduct, quantity: 10 };
      const result = InventoryService.isLowStock(product, 10);

      expect(result).toBe(true);
    });

    it('should return false if product quantity is above threshold', () => {
      const product: Product = { ...mockProduct, quantity: 15 };
      const result = InventoryService.isLowStock(product, 10);

      expect(result).toBe(false);
    });

    it('should use default threshold of 10 if not provided', () => {
      const product: Product = { ...mockProduct, quantity: 5 };
      const result = InventoryService.isLowStock(product);

      expect(result).toBe(true);
    });

    it('should return true for zero quantity', () => {
      const product: Product = { ...mockProduct, quantity: 0 };
      const result = InventoryService.isLowStock(product, 10);

      expect(result).toBe(true);
    });

    it('should handle min_stock as threshold if available', () => {
      const product: Product = { ...mockProduct, quantity: 8, min_stock: 10 };
      const result = InventoryService.isLowStock(product, product.min_stock);

      expect(result).toBe(true);
    });
  });

  describe('filterLowStockProducts', () => {
    it('should filter products below threshold', () => {
      const products: Product[] = [
        { ...mockProduct, id: 'p1', quantity: 5 },
        { ...mockProduct, id: 'p2', quantity: 20 },
        { ...mockProduct, id: 'p3', quantity: 8 },
      ];

      const result = InventoryService.filterLowStockProducts(products, 10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p3');
    });

    it('should return empty array if no low stock products', () => {
      const products: Product[] = [
        { ...mockProduct, id: 'p1', quantity: 50 },
        { ...mockProduct, id: 'p2', quantity: 100 },
      ];

      const result = InventoryService.filterLowStockProducts(products, 10);

      expect(result).toHaveLength(0);
    });

    it('should return all products if all below threshold', () => {
      const products: Product[] = [
        { ...mockProduct, id: 'p1', quantity: 5 },
        { ...mockProduct, id: 'p2', quantity: 3 },
      ];

      const result = InventoryService.filterLowStockProducts(products, 10);

      expect(result).toHaveLength(2);
    });

    it('should use default threshold of 10', () => {
      const products: Product[] = [
        { ...mockProduct, id: 'p1', quantity: 5 },
        { ...mockProduct, id: 'p2', quantity: 20 },
      ];

      const result = InventoryService.filterLowStockProducts(products);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });
  });

  describe('calculateInventoryValue', () => {
    it('should calculate total inventory value', () => {
      const products: Product[] = [
        { ...mockProduct, id: 'p1', price: 100, quantity: 10 },
        { ...mockProduct, id: 'p2', price: 50, quantity: 20 },
        { ...mockProduct, id: 'p3', price: 200, quantity: 5 },
      ];

      const result = InventoryService.calculateInventoryValue(products);

      // (100 * 10) + (50 * 20) + (200 * 5) = 1000 + 1000 + 1000 = 3000
      expect(result).toBe(3000);
    });

    it('should return 0 for empty product list', () => {
      const products: Product[] = [];

      const result = InventoryService.calculateInventoryValue(products);

      expect(result).toBe(0);
    });

    it('should handle decimal prices', () => {
      const products: Product[] = [
        { ...mockProduct, price: 99.99, quantity: 10 },
        { ...mockProduct, price: 50.50, quantity: 5 },
      ];

      const result = InventoryService.calculateInventoryValue(products);

      expect(result).toBeCloseTo(999.9 + 252.5, 1);
    });

    it('should handle zero quantity products', () => {
      const products: Product[] = [
        { ...mockProduct, price: 100, quantity: 10 },
        { ...mockProduct, price: 50, quantity: 0 },
      ];

      const result = InventoryService.calculateInventoryValue(products);

      expect(result).toBe(1000);
    });
  });

  describe('validateStock', () => {
    it('should validate sufficient stock', () => {
      const product: Product = { ...mockProduct, quantity: 50 };
      const result = InventoryService.validateStock(product, 30);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject if quantity exceeds stock', () => {
      const product: Product = { ...mockProduct, quantity: 50 };
      const result = InventoryService.validateStock(product, 60);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Stock insuficiente');
    });

    it('should reject zero or negative quantity', () => {
      const product: Product = { ...mockProduct, quantity: 50 };
      const result = InventoryService.validateStock(product, 0);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('mayor a 0');
    });

    it('should reject negative quantity request', () => {
      const product: Product = { ...mockProduct, quantity: 50 };
      const result = InventoryService.validateStock(product, -10);

      expect(result.valid).toBe(false);
    });

    it('should allow exact stock quantity', () => {
      const product: Product = { ...mockProduct, quantity: 50 };
      const result = InventoryService.validateStock(product, 50);

      expect(result.valid).toBe(true);
    });

    it('should include available quantity in error message', () => {
      const product: Product = { ...mockProduct, quantity: 20 };
      const result = InventoryService.validateStock(product, 30);

      expect(result.error).toContain('20');
    });
  });

  describe('generateMovementId', () => {
    it('should generate unique movement IDs', () => {
      const id1 = InventoryService.generateMovementId();
      const id2 = InventoryService.generateMovementId();

      expect(id1).not.toBe(id2);
    });

    it('should follow MV- prefix pattern', () => {
      const id = InventoryService.generateMovementId();

      expect(id).toMatch(/^MV-/);
    });

    it('should generate valid format', () => {
      const id = InventoryService.generateMovementId();

      expect(id).toMatch(/^MV-\d+-[a-z0-9]+$/i);
    });
  });

  describe('updateStock', () => {
    it('should create movement record with correct type for positive quantity', async () => {
      const movement = await InventoryService.updateStock('prod-1', 10, 'Purchase');

      expect(movement.productId).toBe('prod-1');
      expect(movement.quantity).toBe(10);
      expect(movement.type).toBe('IN');
      expect(movement.reason).toBe('Purchase');
    });

    it('should create movement record with OUT type for negative quantity', async () => {
      const movement = await InventoryService.updateStock('prod-1', -5, 'Sale');

      expect(movement.quantity).toBe(-5);
      expect(movement.type).toBe('OUT');
    });

    it('should set timestamp', async () => {
      const before = new Date();
      const movement = await InventoryService.updateStock('prod-1', 1, 'Test');
      const after = new Date();

      expect(movement.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(movement.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
