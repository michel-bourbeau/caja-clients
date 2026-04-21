# Quick Test Guide - Vuelto (Change) Feature

## Pre-requisites
- Browser with access to the POS page
- Test tenant with products and settings configured
- Currency configured (preferably with symbol visible)

## Test Scenario 1: Basic Change Calculation

**Setup:**
1. Navigate to `/dashboard/pos`
2. Add a product to cart (e.g., price: 150)
3. Verify total shows correctly

**Test Steps:**
1. Select "EFECTIVO" from payment method dropdown
2. Observe: "Monto Recibido" input field appears with blue background
3. Enter amount: **200**
4. Observe: Green box appears showing "Vuelto: 50" (or equivalent in currency)
5. Click "Completar Venta"
6. Verify: Transaction completes successfully
7. Observe: Amount received resets to empty

**Expected Result:** ✅ PASS
- Input field visible only for CASH
- Change calculated correctly (200 - 150 = 50)
- Transaction proceeds
- State resets

---

## Test Scenario 2: Insufficient Amount (Blocked Transaction)

**Setup:**
1. Add product to cart (price: 150)
2. Select "EFECTIVO"

**Test Steps:**
1. Enter amount: **100**
2. Observe: Red alert appears showing "⚠ Monto Insuficiente"
3. Text shows: "Falta: 50" (missing amount)
4. Click "Completar Venta"
5. Observe: Red error message appears
6. Text shows: "Monto insuficiente. El cliente debe pagar más."
7. Transaction is NOT completed

**Expected Result:** ✅ PASS
- Insufficient amount prevents transaction
- Clear error message guides cashier
- User can adjust amount and retry

---

## Test Scenario 3: Exact Amount

**Setup:**
1. Add product to cart (price: 150)
2. Select "EFECTIVO"

**Test Steps:**
1. Enter amount: **150**
2. Observe: Green box appears
3. Text shows: "✓ Monto Exacto" and "Sin vuelto"
4. Click "Completar Venta"
5. Transaction completes

**Expected Result:** ✅ PASS
- Exact amount displays confirmation
- "Sin vuelto" message is clear
- Transaction proceeds

---

## Test Scenario 4: Hidden for Other Payment Methods

**Setup:**
1. Add product to cart
2. Observe the payment method dropdown

**Test Steps:**
1. Select "TARJETA" (CARD)
2. Observe: "Monto Recibido" input disappears
3. Select "TRANSFERENCIA" (TRANSFER)
4. Observe: "Monto Recibido" input disappears
5. Select "EFECTIVO" again
6. Observe: "Monto Recibido" input reappears

**Expected Result:** ✅ PASS
- Change calculator only shows for CASH
- Seamless show/hide on payment method change

---

## Test Scenario 5: Real-time Recalculation with Discounts

**Setup:**
1. Add product to cart (price: 200)
2. Select "EFECTIVO"
3. Enter amount received: **300**
4. Observe initial vuelto: **100**

**Test Steps:**
1. Apply discount of **50** to the order
2. Observe new subtotal: **150** (200 - 50)
3. Observe updated vuelto: **150** (300 - 150)
4. Adjust discount to **100**
5. Observe new subtotal: **100** (200 - 100)
6. Observe updated vuelto: **200** (300 - 100)

**Expected Result:** ✅ PASS
- Change recalculates automatically when discount changes
- Real-time updates show correct values

---

## Test Scenario 6: Reset on Cancel

**Setup:**
1. Add products to cart
2. Select "EFECTIVO"
3. Enter amount: **500**
4. Observe vuelto displayed

**Test Steps:**
1. Click "Cancelar" button
2. Observe: Cart is cleared
3. Observe: "Monto Recibido" input is reset/empty
4. Add new products to cart
5. Select "EFECTIVO" again
6. Observe: Amount field is empty (fresh start)

**Expected Result:** ✅ PASS
- Cancel clears all transaction data including amount received
- Fresh state ready for next transaction

---

## Test Scenario 7: Currency Formatting

**Setup:**
- Tenant with currency configured (NIO, USD, etc.)
- Product prices with decimals (e.g., 99.99)

**Test Steps:**
1. Add product with price **99.99**
2. Select "EFECTIVO"
3. Enter amount: **150.50**
4. Observe: Vuelto shows **50.51** (or equivalent)
5. Verify currency symbol is displayed correctly

**Expected Result:** ✅ PASS
- Currency symbol appears in label: "Monto Recibido (₡)"
- All amounts formatted correctly with currency
- Decimal precision maintained

---

## Test Scenario 8: Invalid Input Handling

**Setup:**
1. Add product to cart
2. Select "EFECTIVO"

**Test Steps:**
1. Try entering negative number: **-50**
2. Observe: Input prevents negative (Math.max(0, ...))
3. Try entering text: **abc**
4. Observe: Non-numeric input ignored
5. Try entering very large number: **999999.99**
6. Observe: Input accepted, vuelto calculated correctly

**Expected Result:** ✅ PASS
- Invalid inputs are handled gracefully
- No crashes or error states
- UI remains functional

---

## Test Scenario 9: Multiple Items & Taxes

**Setup:**
- Product 1: 100 (qty: 2)
- Product 2: 50 (qty: 1)
- Subtotal: 250
- Tax rate: 15%
- Total: 287.50 (after tax)

**Test Steps:**
1. Add all products to cart
2. Select "EFECTIVO"
3. Observe total: 287.50
4. Enter amount: **300**
5. Observe vuelto: **12.50**
6. Click "Completar Venta"
7. Verify transaction includes all items

**Expected Result:** ✅ PASS
- Vuelto calculation respects taxes
- Complex carts calculate correctly
- Transaction records accurate totals

---

## Test Scenario 10: Mobile Responsiveness

**Setup:**
- Mobile device or browser resized to mobile width

**Test Steps:**
1. Navigate to POS page on mobile
2. Add product to cart
3. Tap "Carrito" button to open drawer
4. Select "EFECTIVO"
5. Observe: "Monto Recibido" input displays properly
6. Enter amount and verify change shows
7. Tap "Completar Venta"

**Expected Result:** ✅ PASS
- Vuelto UI adapts to mobile screens
- Input field is tappable and usable
- Change display is readable on small screens
- No overflow or layout issues

---

## Summary Checklist

- [ ] Cash payment method shows change calculator
- [ ] Other payment methods hide change calculator
- [ ] Insufficient amount shows red error and blocks transaction
- [ ] Exact amount shows green confirmation
- [ ] Change amounts show green with large font
- [ ] Change recalculates when discount changes
- [ ] Change recalculates when taxes change
- [ ] Amount received resets after successful transaction
- [ ] Amount received resets on cancel
- [ ] Currency formatting is correct
- [ ] Mobile layout works properly
- [ ] No console errors
- [ ] No performance issues

**All tests passing? Feature is complete! ✅**
