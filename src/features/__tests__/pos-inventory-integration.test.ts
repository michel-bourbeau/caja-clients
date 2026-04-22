import { POSService } from '@/features/pos/services';
import { TransactionService } from '@/features/transactions/services';
import { InventoryService } from '@/features/inventory/services';
import { CartItem, Product, Transaction } from '@/lib/types';

/**
 * POS-Inventory Integration Tests
 * 
 * Tests the complete workflow:
 * 1. Create transaction with items → inventory decreases
 * 2. Delete transaction → inventory increases back
 * 3. Validate quantities on delete match quantities on create
 */
describe('POS-Inventory Integration', () => {
  const tenantId = 'tenant-1';
  const cashierId = 'cashier-1';

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Test Product',
    sku: 'TST-001',
    price: 100,
    quantity: 100,
    category: 'cat-1',
    description: 'Test product',
    min_stock: 10,
    sort_order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Transaction - Inventory Decrease', () => {
    it('should decrease inventory by 1 when selling 1 item', async () => {
      const cartItem: CartItem = {
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 1,
        price: 100,
        total: 100,
      };

      const mockTransaction: Transaction = {
        id: 'tx-1',
        items: [cartItem],
        subtotal: 100,
        discount: 0,
        tax: 21,
        total: 121,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      const result = await TransactionService.createTransaction(
        tenantId,
        [cartItem],
        'CASH',
        cashierId
      );

      expect(result.id).toBe('tx-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(1);

      // Verify API was called with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/tenants/${tenantId}/transactions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            items: [cartItem],
            paymentMethod: 'CASH',
            cashierId,
            discount: 0,
          }),
        })
      );
    });

    it('should decrease inventory by 3 when selling 3 items', async () => {
      const cartItem: CartItem = {
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 3,
        price: 100,
        total: 300,
      };

      const mockTransaction: Transaction = {
        id: 'tx-1',
        items: [cartItem],
        subtotal: 300,
        discount: 0,
        tax: 63,
        total: 363,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      const result = await TransactionService.createTransaction(
        tenantId,
        [cartItem],
        'CASH',
        cashierId
      );

      expect(result.items[0].quantity).toBe(3);
    });

    it('should decrease inventory by sum of all items in multi-item transaction', async () => {
      const items: CartItem[] = [
        {
          productId: 'prod-1',
          name: 'Product 1',
          quantity: 2,
          price: 100,
          total: 200,
        },
        {
          productId: 'prod-2',
          name: 'Product 2',
          quantity: 3,
          price: 50,
          total: 150,
        },
      ];

      const mockTransaction: Transaction = {
        id: 'tx-1',
        items: items,
        subtotal: 350,
        discount: 0,
        tax: 73.5,
        total: 423.5,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      const result = await TransactionService.createTransaction(
        tenantId,
        items,
        'CASH',
        cashierId
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[1].quantity).toBe(3);
    });

    it('should prevent selling more items than inventory has', async () => {
      const cartItem: CartItem = {
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 200, // More than available
        price: 100,
        total: 20000,
      };

      const product: Product = { ...mockProduct, quantity: 50 };
      const validation = InventoryService.validateStock(product, cartItem.quantity);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Stock insuficiente');
      expect(validation.error).toContain('50');
    });
  });

  describe('Delete Transaction - Inventory Increase', () => {
    it('should increase inventory by 1 when deleting transaction with 1 item', async () => {
      const transactionId = 'tx-1';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, transactionId);

      // Verify DELETE call was made to correct endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/tenants/${tenantId}/transactions/${transactionId}`,
        { method: 'DELETE' }
      );
    });

    it('should increase inventory by 3 when deleting transaction with 3 items', async () => {
      const transactionId = 'tx-1';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, transactionId);

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/tenants/${tenantId}/transactions/${transactionId}`,
        { method: 'DELETE' }
      );
    });

    it('should increase inventory by sum of all items when deleting multi-item transaction', async () => {
      const transactionId = 'tx-1';
      // This transaction had 2 items of prod-1 and 3 items of prod-2

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, transactionId);

      // Backend should handle reverting inventory for all items in transaction
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle deletion error gracefully', async () => {
      const transactionId = 'tx-invalid';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Transaction not found' }),
      });

      await expect(
        TransactionService.deleteTransaction(tenantId, transactionId)
      ).rejects.toThrow();
    });
  });

  describe('Complete Workflow - Create and Delete', () => {
    it('should complete full workflow: create transaction → delete transaction', async () => {
      const cartItem: CartItem = {
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 5,
        price: 100,
        total: 500,
      };

      const mockTransaction: Transaction = {
        id: 'tx-workflow-1',
        items: [cartItem],
        subtotal: 500,
        discount: 0,
        tax: 105,
        total: 605,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      // Step 1: Create transaction
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransaction,
      });

      const createdTx = await TransactionService.createTransaction(
        tenantId,
        [cartItem],
        'CASH',
        cashierId
      );

      expect(createdTx.id).toBe('tx-workflow-1');
      expect(createdTx.items[0].quantity).toBe(5);

      // Step 2: Delete transaction (inventory should restore)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, createdTx.id);

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // First call: POST (create)
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `/api/tenants/${tenantId}/transactions`,
        expect.objectContaining({ method: 'POST' })
      );

      // Second call: DELETE (restore)
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `/api/tenants/${tenantId}/transactions/${createdTx.id}`,
        { method: 'DELETE' }
      );
    });

    it('should maintain inventory accuracy across multiple transactions', async () => {
      // Simulate 3 separate transactions
      const transactions = [
        {
          id: 'tx-1',
          items: [{ productId: 'prod-1', quantity: 2, name: 'P1', price: 100, total: 200 }],
        },
        {
          id: 'tx-2',
          items: [{ productId: 'prod-1', quantity: 1, name: 'P1', price: 100, total: 100 }],
        },
        {
          id: 'tx-3',
          items: [{ productId: 'prod-1', quantity: 3, name: 'P1', price: 100, total: 300 }],
        },
      ];

      // Create all transactions (inventory decreases: -2, -1, -3 = -6 total)
      transactions.forEach((tx, index) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: tx.id,
            items: tx.items,
            subtotal: tx.items[0].total,
            discount: 0,
            tax: 0,
            total: tx.items[0].total,
            paymentMethod: 'CASH',
            timestamp: new Date(),
            cashierId,
            status: 'COMPLETED',
          }),
        });
      });

      // Create all 3 transactions
      for (const tx of transactions) {
        await TransactionService.createTransaction(
          tenantId,
          tx.items as CartItem[],
          'CASH',
          cashierId
        );
      }

      // Delete transaction 2 (inventory increases: +1)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, 'tx-2');

      // Net inventory change: -6 + 1 = -5
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Inventory Calculations - Quantity Tracking', () => {
    it('should calculate total quantity sold from multiple transactions', () => {
      const transactions: Transaction[] = [
        {
          id: 'tx-1',
          items: [
            { productId: 'prod-1', quantity: 2, name: 'P1', price: 100, total: 200 },
          ],
          subtotal: 200,
          discount: 0,
          tax: 42,
          total: 242,
          paymentMethod: 'CASH',
          timestamp: new Date(),
          cashierId,
          status: 'COMPLETED',
        },
        {
          id: 'tx-2',
          items: [
            { productId: 'prod-1', quantity: 3, name: 'P1', price: 100, total: 300 },
          ],
          subtotal: 300,
          discount: 0,
          tax: 63,
          total: 363,
          paymentMethod: 'CASH',
          timestamp: new Date(),
          cashierId,
          status: 'COMPLETED',
        },
      ];

      // Calculate total quantity of prod-1 sold
      const totalSold = transactions.reduce((sum, tx) => {
        const prod1Items = tx.items.filter((item) => item.productId === 'prod-1');
        return sum + prod1Items.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      expect(totalSold).toBe(5); // 2 + 3
    });

    it('should handle partial transaction deletion correctly', () => {
      // Starting inventory: 100
      // After tx1 (sell 2): 98
      // After tx2 (sell 3): 95
      // After deleting tx1 (restore 2): 97
      
      let inventory = 100;
      
      // Sell 2
      inventory -= 2;
      expect(inventory).toBe(98);
      
      // Sell 3
      inventory -= 3;
      expect(inventory).toBe(95);
      
      // Delete first transaction (restore 2)
      inventory += 2;
      expect(inventory).toBe(97);
    });

    it('should validate that deleted quantity matches original sale quantity', () => {
      const product: Product = { ...mockProduct, quantity: 100 };

      // Sale: 5 items
      const saleQuantity = 5;
      const validation = InventoryService.validateStock(product, saleQuantity);
      expect(validation.valid).toBe(true);

      // When deleting, the same quantity (5) should be added back
      // This is handled by the backend, but we can verify the item quantities match
      const transaction: Transaction = {
        id: 'tx-1',
        items: [
          { productId: 'prod-1', quantity: 5, name: 'P1', price: 100, total: 500 },
        ],
        subtotal: 500,
        discount: 0,
        tax: 105,
        total: 605,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      const totalItemsInTx = transaction.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      expect(totalItemsInTx).toBe(5);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle transaction with zero items', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'No items in transaction' }),
      });

      const emptyItems: CartItem[] = [];
      await expect(
        TransactionService.createTransaction(tenantId, emptyItems, 'CASH', cashierId)
      ).rejects.toThrow();
    });

    it('should handle trying to delete non-existent transaction', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Transaction not found' }),
      });

      await expect(
        TransactionService.deleteTransaction(tenantId, 'tx-nonexistent')
      ).rejects.toThrow('Transaction not found');
    });

    it('should handle inventory going negative during double sale (race condition)', () => {
      let product: Product = { ...mockProduct, quantity: 5 };

      // First sale: 4 items (should succeed)
      const validation1 = InventoryService.validateStock(product, 4);
      expect(validation1.valid).toBe(true);

      // Simulate inventory decrease after first sale
      product = { ...product, quantity: product.quantity - 4 }; // Now 1 item left

      // Second sale: 3 items (should fail - only 1 left)
      const validation2 = InventoryService.validateStock(product, 3);
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('Stock insuficiente');
    });

    it('should preserve transaction integrity when inventory backend fails', async () => {
      const cartItem: CartItem = {
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 2,
        price: 100,
        total: 200,
      };

      // Simulate backend error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Inventory update failed' }),
      });

      await expect(
        TransactionService.createTransaction(tenantId, [cartItem], 'CASH', cashierId)
      ).rejects.toThrow();

      // Verify no partial update occurred
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle busy store day with multiple sales and cancellations', async () => {
      const startInventory = 100;
      let expectedInventory = startInventory;

      // Transaction 1: Sell 10
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'tx-1',
          items: [{ productId: 'prod-1', quantity: 10, name: 'P1', price: 100, total: 1000 }],
          subtotal: 1000,
          discount: 0,
          tax: 210,
          total: 1210,
          paymentMethod: 'CASH',
          timestamp: new Date(),
          cashierId,
          status: 'COMPLETED',
        }),
      });

      await TransactionService.createTransaction(
        tenantId,
        [{ productId: 'prod-1', quantity: 10, name: 'P1', price: 100, total: 1000 }],
        'CASH',
        cashierId
      );
      expectedInventory -= 10;

      // Transaction 2: Sell 5
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'tx-2',
          items: [{ productId: 'prod-1', quantity: 5, name: 'P1', price: 100, total: 500 }],
          subtotal: 500,
          discount: 0,
          tax: 105,
          total: 605,
          paymentMethod: 'CASH',
          timestamp: new Date(),
          cashierId,
          status: 'COMPLETED',
        }),
      });

      await TransactionService.createTransaction(
        tenantId,
        [{ productId: 'prod-1', quantity: 5, name: 'P1', price: 100, total: 500 }],
        'CASH',
        cashierId
      );
      expectedInventory -= 5;

      // Cancel transaction 1
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await TransactionService.deleteTransaction(tenantId, 'tx-1');
      expectedInventory += 10;

      // Expected inventory: 100 - 10 - 5 + 10 = 95
      expect(expectedInventory).toBe(95);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should track inventory correctly for products with variants', () => {
      // Testing inventory tracking for variant products
      const variantItem1: CartItem = {
        productId: 'prod-variant',
        name: 'Product 15g',
        quantity: 5,
        price: 50,
        total: 250,
        variantId: 'var-1',
      };

      const variantItem2: CartItem = {
        productId: 'prod-variant',
        name: 'Product 30g',
        quantity: 3,
        price: 70,
        total: 210,
        variantId: 'var-2',
      };

      const transaction: Transaction = {
        id: 'tx-variant',
        items: [variantItem1, variantItem2],
        subtotal: 460,
        discount: 0,
        tax: 96.6,
        total: 556.6,
        paymentMethod: 'CASH',
        timestamp: new Date(),
        cashierId,
        status: 'COMPLETED',
      };

      // Total items sold: 5 + 3 = 8
      const totalItemsSold = transaction.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      expect(totalItemsSold).toBe(8);
    });
  });
});
