# 🥉 Calcul de Monnaie Rendue (Vuelto) - Documentation

## Overview
The Vuelto (Change) feature is a simple yet impactful module that calculates the exact change to be returned to customers when they pay in cash. This prevents calculation errors and accelerates the checkout process.

## Features

### 1. **Amount Received Input**
- Only appears when "EFECTIVO" (CASH) payment method is selected
- Cashier enters the exact amount received from the customer
- Accepts decimal values for accurate currency handling
- Input is validated (non-negative values only)

### 2. **Automatic Change Calculation**
- Real-time calculation as the cashier enters the amount
- Intelligently handles three scenarios:
  - **Insufficient Amount**: Shows red alert with the remaining balance needed
  - **Exact Amount**: Shows green confirmation "Sin vuelto" (No change)
  - **Change Available**: Displays the exact change amount in large, clear font

### 3. **Visual Feedback**
- **Blue Panel**: Contains the amount input field (visible only for CASH payments)
- **Red Alert** (Insufficient): `⚠ Monto Insuficiente` with amount needed
- **Green Exact**: `✓ Monto Exacto` for exact payment
- **Green Change**: Vuelto amount displayed prominently in bold

### 4. **Validation & Prevention**
- Sale cannot be completed if the amount is insufficient
- Clear error message: "Monto insuficiente. El cliente debe pagar más."
- Validation occurs before transaction submission

### 5. **State Management**
- Amount received is reset when:
  - A sale is completed successfully
  - The "Cancelar" (Cancel) button is clicked
  - The cart is cleared
- Persists during calculation but not across sessions

## Implementation Details

### UI Components Location
File: [src/app/dashboard/pos/page.tsx](src/app/dashboard/pos/page.tsx)

#### State Variables
```typescript
const [amountReceived, setAmountReceived] = useState<number>(0);
```

#### Change Calculation Logic
```typescript
const changeCalculation = useMemo(() => {
  const change = amountReceived - cartTotal.total;
  return {
    amountReceived,
    change: change < 0 ? 0 : change,
    isInsufficientAmount: amountReceived > 0 && change < 0,
    isExactAmount: amountReceived > 0 && change === 0,
  };
}, [amountReceived, cartTotal.total]);
```

#### Validation Check
```typescript
if (paymentMethod === "CASH" && changeCalculation.isInsufficientAmount) {
  setMessage("Monto insuficiente. El cliente debe pagar más.");
  setMessageType("error");
  return;
}
```

## User Workflow

### Step 1: Select CASH Payment
```
Payment Method Dropdown → Select "EFECTIVO"
```

### Step 2: View Change Calculator
The "Monto Recibido" (Amount Received) input appears in a blue panel

### Step 3: Enter Amount Received
Cashier types the amount customer provided

### Step 4: Review Change Calculation
- System displays immediately:
  - Change needed (red) OR
  - Exact amount confirmation (green) OR
  - Change to return (green)

### Step 5: Complete Sale
- If amount is sufficient: Click "Completar Venta"
- If amount is insufficient: Show error, request more money
- Customer receives correct change

## Currency Handling

- Uses the tenant's configured currency symbol via `useCurrency()` hook
- Example: "Monto Recibido (₡)" or "Monto Recibido ($)"
- All calculations respect the currency's decimal precision
- Change is formatted with the same currency formatting as totals

## Integration with Existing Features

### Payment Methods
- **EFECTIVO (CASH)**: Shows vuelto calculator ✅
- **TARJETA (CARD)**: No change calculation needed
- **TRANSFERENCIA (TRANSFER)**: No change calculation needed

### Cart Operations
- When items are added/removed: Change recalculates automatically
- When discount is applied: Change recalculates automatically
- When taxes change: Change recalculates automatically

### Transaction Creation
- Vuelto amount is NOT stored in the transaction
- Only payment method is saved
- Vuelto is purely for cashier guidance during checkout

## Error Scenarios

| Scenario | Display | Action |
|----------|---------|--------|
| Amount < Total | Red alert with missing amount | Prevent transaction |
| Amount = Total | Green "Sin vuelto" | Allow transaction |
| Amount > Total | Green with change amount | Allow transaction |
| CARD/TRANSFER selected | Hidden | N/A |

## Accessibility Features

- Clear labels: "Monto Recibido"
- Input field has `id="amountReceived"` for label association
- Large, readable change display (text-lg, font-bold)
- Color-coded status (red/green) + icon + text
- Keyboard accessible (standard input field)
- Currency symbol context provided

## Performance Considerations

- Change calculation uses `useMemo` with dependencies: `[amountReceived, cartTotal.total]`
- Recalculates only when amount or total changes
- No database queries needed
- Real-time display (no debouncing needed)

## Testing Recommendations

1. **Amount Less Than Total**
   - Enter: 100, Total: 150
   - Expected: Red alert showing "Falta: 50"

2. **Exact Amount**
   - Enter: 150, Total: 150
   - Expected: Green "Sin vuelto"

3. **Amount Greater Than Total**
   - Enter: 200, Total: 150
   - Expected: Green showing "Vuelto: 50"

4. **Payment Method Changes**
   - Select CASH → See calculator
   - Switch to CARD → Calculator hidden
   - Back to CASH → Calculator visible (reset)

5. **After Successful Transaction**
   - Complete sale with cash
   - Verify amount received is reset to 0
   - New transaction starts fresh

6. **Discount & Tax Integration**
   - Apply discount → Verify change recalculates
   - Add taxes → Verify change recalculates
   - Change amount should always reflect cartTotal.total

## Future Enhancements

- [ ] Quick buttons for common denominations (₡500, ₡1000, etc.)
- [ ] Keyboard shortcut to complete sale when amount is sufficient
- [ ] Payment receipt printing with change amount
- [ ] Change breakdown by denomination (coins/bills)
- [ ] Daily cash drawer reconciliation
- [ ] Amount received analytics

## Related Files

- **POS Service**: [src/features/pos/services.ts](src/features/pos/services.ts)
- **Tax Service**: [src/features/taxes/services.ts](src/features/taxes/services.ts)
- **Currency Hook**: [src/lib/utils/useCurrency.ts](src/lib/utils/useCurrency.ts)

## Summary

The Vuelto feature is a simple, focused module that:
- ✅ Prevents cash handling errors
- ✅ Accelerates checkout process
- ✅ Provides clear visual feedback
- ✅ Validates transactions before submission
- ✅ Integrates seamlessly with existing POS workflow
