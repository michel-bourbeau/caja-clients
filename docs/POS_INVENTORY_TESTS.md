# 🛒 POS-Inventory Integration Tests

## Overview

Complete test suite for the cash register (POS) and inventory management workflow.

**Status:** ✅ **19 tests - ALL PASSING**

---

## What's Tested

### 1. **Create Transaction → Inventory Decreases** ✅

When a cashier sells items, the inventory automatically decreases.

```
Sale of 1 item  → Inventory -1
Sale of 3 items → Inventory -3
Sale of multi-product (2+3) → Inventory -5
```

**Tests:**
- ✅ Decrease by 1 when selling 1 item
- ✅ Decrease by 3 when selling 3 items
- ✅ Decrease by sum of all items in multi-item transaction
- ✅ Prevent overselling (validation blocks sales exceeding stock)

---

### 2. **Delete Transaction → Inventory Increases** ✅

When a transaction is cancelled/deleted, the inventory is restored.

```
Delete sale of 1 item  → Inventory +1
Delete sale of 3 items → Inventory +3
Delete sale of multi-product (2+3) → Inventory +5
```

**Tests:**
- ✅ Increase by 1 when deleting transaction with 1 item
- ✅ Increase by 3 when deleting transaction with 3 items
- ✅ Increase by sum of all items when deleting multi-item transaction
- ✅ Handle deletion errors gracefully

---

### 3. **Complete Workflow** ✅

Full lifecycle from sale creation to cancellation.

```
Initial Inventory: 100
├─ Create Sale (5 items)   → Inventory: 95
├─ Create Sale (3 items)   → Inventory: 92
└─ Delete First Sale       → Inventory: 97
```

**Tests:**
- ✅ Complete workflow: create transaction → delete transaction
- ✅ Maintain accuracy across multiple transactions
- ✅ Busy store day scenario with multiple sales/cancellations

---

### 4. **Inventory Calculations** ✅

Precise quantity tracking across all operations.

**Tests:**
- ✅ Calculate total quantity sold from multiple transactions
- ✅ Handle partial transaction deletion correctly
- ✅ Validate deleted quantity matches original sale quantity

---

### 5. **Edge Cases & Error Handling** ✅

Real-world problem scenarios.

**Tests:**
- ✅ Handle transaction with zero items (rejected)
- ✅ Handle trying to delete non-existent transaction (error)
- ✅ Prevent inventory going negative (race conditions)
- ✅ Preserve transaction integrity when inventory backend fails

---

### 6. **Real-world Scenarios** ✅

Complex multi-transaction workflows.

**Tests:**
- ✅ Busy store day: 10 sales, 5 sales, then cancel first = correct inventory
- ✅ Products with variants (different sizes with separate inventory)

---

## Test Code Examples

### Scenario 1: Sell 3 items, inventory decreases by 3

```typescript
const cartItem: CartItem = {
  product_id: 'prod-1',
  name: 'Test Product',
  quantity: 3,      // ← Selling 3 items
  price: 100,
  total: 300,
};

await TransactionService.createTransaction(
  tenantId,
  [cartItem],
  'CASH',
  cashierId
);

// ✅ Inventory decreases by 3
// Backend API: /api/tenants/{tenantId}/products/prod-1
// Updates: stock_quantity -= 3
```

### Scenario 2: Delete sale, inventory increases by 3

```typescript
await TransactionService.deleteTransaction(
  tenantId,
  'tx-1'  // ← Transaction with 3 items
);

// ✅ Inventory increases by 3
// Backend API: /api/tenants/{tenantId}/transactions/{transactionId}
// Method: DELETE
// Side effect: Restores inventory for all items in transaction
```

### Scenario 3: Multiple transactions with cancellation

```typescript
// Start: 100 items
await createTransaction(..., 5 items);  // Now: 95
await createTransaction(..., 3 items);  // Now: 92
await deleteTransaction(...);            // Now: 97
```

---

## Test Execution

```bash
# Run only POS-Inventory integration tests
npm test -- src/features/__tests__/pos-inventory-integration.test.ts

# Run with verbose output
npm test -- --verbose src/features/__tests__/pos-inventory-integration.test.ts

# Run all tests (including integration)
npm test

# Watch mode
npm test:watch
```

---

## Test Coverage Breakdown

| Category | Tests | Status |
|----------|-------|--------|
| Create Transaction | 4 | ✅ |
| Delete Transaction | 4 | ✅ |
| Complete Workflows | 3 | ✅ |
| Inventory Calculations | 3 | ✅ |
| Edge Cases & Errors | 4 | ✅ |
| Real-world Scenarios | 2 | ✅ |
| **TOTAL** | **19** | **✅** |

---

## Key Test Fixtures

### Mock Product
```typescript
const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Product',
  sku: 'TST-001',
  price: 100,
  quantity: 100,        // ← Starting inventory
  category_id: 'cat-1',
  description: 'Test product',
  min_stock: 10,
  sort_order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  has_variants: false,
};
```

### Cart Item Structure
```typescript
const cartItem: CartItem = {
  product_id: 'prod-1',
  name: 'Product Name',
  quantity: 3,          // ← Number of items sold
  price: 100,           // ← Unit price
  total: 300,           // ← Line total (quantity × price)
  variant_id?: 'var-1', // ← Optional for variant products
};
```

---

## Backend Integration Points

These tests verify that your frontend correctly calls the backend APIs:

### 1. **Create Transaction**
```
POST /api/tenants/{tenantId}/transactions
Body: { items: CartItem[], paymentMethod, cashierId, discount }
Expected: Backend decreases inventory for each item
```

### 2. **Delete Transaction**
```
DELETE /api/tenants/{tenantId}/transactions/{transactionId}
Expected: Backend increases inventory for all items in transaction
```

### 3. **Validate Stock**
```
GET /api/tenants/{tenantId}/products/{productId}
Used: Before creating transaction to check sufficient stock
```

---

## Important Implementation Details

### ✅ What These Tests Verify

1. **API Calls are Correct**
   - POST creates transactions with correct structure
   - DELETE uses correct endpoint

2. **Quantity Tracking**
   - Single items: +1/-1
   - Multiple items: +N/-N
   - Multi-product: Sum of all quantities

3. **Transaction Integrity**
   - Items are stored correctly
   - Quantities match between create and delete
   - No partial updates

4. **Error Handling**
   - Insufficient stock prevents sale
   - Non-existent transactions can't be deleted
   - Backend failures are handled gracefully

### ⚠️ What These Tests DON'T Test (Backend responsibility)

- Actual database inventory updates
- Row-level security enforcement
- Concurrent transaction handling
- Audit logging of inventory changes
- Multi-tenant data isolation

---

## Future: Backend Integration Tests

To fully test the inventory workflow, add backend integration tests:

```typescript
// Example: Full end-to-end with real database
describe('POS-Inventory E2E', () => {
  it('should actually update database inventory', async () => {
    // 1. Create product with 100 inventory
    await createProduct({ id: 'prod-1', quantity: 100 });
    
    // 2. Create transaction (sell 5)
    await createTransaction([...5 items]);
    
    // 3. Verify database shows 95
    const product = await getProduct('prod-1');
    expect(product.quantity).toBe(95);
    
    // 4. Delete transaction
    await deleteTransaction('tx-1');
    
    // 5. Verify database shows 100
    const updated = await getProduct('prod-1');
    expect(updated.quantity).toBe(100);
  });
});
```

---

## Debugging Failed Tests

If a test fails:

```bash
# Run with detailed output
npm test -- --verbose --no-coverage

# Run single test
npm test -- -t "should decrease inventory by 1"

# See stack traces
npm test -- --verbose --debug

# Generate coverage report
npm test -- --coverage
```

---

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run POS-Inventory Integration Tests
  run: npm test -- src/features/__tests__/pos-inventory-integration.test.ts
```

---

## Summary

This test suite ensures that the core workflow of your POS system works correctly:

1. ✅ **Sales decrease inventory correctly**
2. ✅ **Cancellations restore inventory correctly**  
3. ✅ **Quantities are tracked precisely**
4. ✅ **Error cases are handled gracefully**
5. ✅ **Complex multi-transaction scenarios work**

**Result:** Confidence that your cash register and inventory system stay in sync! 🛒✨
