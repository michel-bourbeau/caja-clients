# 🥉 Vuelto Feature - Quick Reference

## What is it?
The Vuelto (Change) calculator for CASH payments. When a cashier enters the amount a customer paid, the system automatically calculates and displays the exact change needed.

## Where to find it?
📍 **Location**: POS Page (`/dashboard/pos`)  
📍 **When**: Only appears when "EFECTIVO" (CASH) is selected in payment method dropdown

## How to use it (30 seconds)

1. **Add items to cart** → Select discount (if any)
2. **Choose "EFECTIVO"** → Change calculator appears (blue panel)
3. **Type amount received** → System shows change immediately
4. **Check the display**:
   - 🔴 Red = Not enough money (can't complete)
   - 🟢 Green = Enough money (can complete)
5. **Click "Completar Venta"** → Done! Resets for next customer

## Quick Scenarios

| What Happens | Display | Can Complete? |
|--------------|---------|---------------|
| Enter 100, Total 150 | 🔴 Falta: 50 | ❌ No |
| Enter 150, Total 150 | 🟢 Sin vuelto | ✅ Yes |
| Enter 200, Total 150 | 🟢 Vuelto: 50 | ✅ Yes |
| Select CARD | (Hidden) | N/A |

## Key Features

| Feature | What it does |
|---------|-------------|
| Real-time | Change updates as you type |
| Smart | Only shows for CASH |
| Safe | Prevents mistakes (red alert) |
| Clear | Large green display for change |
| Auto-reset | Clears after each sale |

## For Developers

### State
```javascript
const [amountReceived, setAmountReceived] = useState<number>(0);
```

### Logic
```javascript
const change = amountReceived - cartTotal.total;
const isInsufficientAmount = amountReceived > 0 && change < 0;
```

### Validation
```javascript
if (paymentMethod === "CASH" && change < 0) {
  // Prevent transaction
}
```

## Files

| File | Purpose |
|------|---------|
| [src/app/dashboard/pos/page.tsx](src/app/dashboard/pos/page.tsx) | Feature implementation |
| [VUELTO_FEATURE.md](VUELTO_FEATURE.md) | Full documentation |
| [VUELTO_TEST_GUIDE.md](VUELTO_TEST_GUIDE.md) | Test scenarios |

## Testing

**Quick test**: 
1. Go to POS page
2. Add item (price 100)
3. Select CASH
4. Enter 200 → Should show "Vuelto: 100" ✅

**Full testing**: See [VUELTO_TEST_GUIDE.md](VUELTO_TEST_GUIDE.md)

## Common Questions

**Q: Why doesn't it work for CARD?**  
A: Card payments don't need change calculation—only CASH does.

**Q: Can I modify the amount after entering it?**  
A: Yes, just change the number and the vuelto recalculates instantly.

**Q: What happens to the amount when I complete a sale?**  
A: It resets to empty automatically, ready for the next customer.

**Q: Does it work on mobile?**  
A: Yes, fully responsive on phones and tablets.

**Q: What if the customer gives me more than asked?**  
A: The green display shows the exact vuelto to give back.

**Q: What if the customer gives me less than asked?**  
A: Red alert shows the missing amount and prevents sale completion.

## Status

✅ **COMPLETE AND READY TO USE**

- Implemented: ✅
- Tested: ✅ (See test guide)
- Documented: ✅
- Mobile Ready: ✅
- Production Ready: ✅

---

**Need more details?** See [VUELTO_FEATURE.md](VUELTO_FEATURE.md)  
**Want to test it?** Follow [VUELTO_TEST_GUIDE.md](VUELTO_TEST_GUIDE.md)  
**Implementation details?** Check [VUELTO_IMPLEMENTATION_COMPLETE.md](VUELTO_IMPLEMENTATION_COMPLETE.md)
