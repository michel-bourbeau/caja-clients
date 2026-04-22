# 🚀 Caja POS - Unit Testing Commands Reference

## Quick Commands

```bash
# RUN ALL TESTS (68 tests, ~0.85s)
npm test

# WATCH MODE (re-runs on file changes)
npm test:watch

# COVERAGE REPORT
npm test:coverage

# RUN SPECIFIC TEST FILE
npm test -- src/features/taxes/__tests__/services.test.ts

# RUN SPECIFIC TEST BY NAME
npm test -- -t "should decrease inventory by 1"

# VERBOSE OUTPUT
npm test -- --verbose

# DEBUG MODE
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Test Suites Available

### 1. Taxes Tests (15 tests)
```bash
npm test -- src/features/taxes/__tests__/services.test.ts
```
Tests tax calculations, multiple taxes, decimal precision.

### 2. POS Calculations Tests (23 tests)
```bash
npm test -- src/features/pos/utils/__tests__/calculations.test.ts
```
Tests financial calculations, rounding, edge cases.

### 3. Inventory Tests (11 tests)
```bash
npm test -- src/features/inventory/__tests__/services.test.ts
```
Tests stock validation, low stock detection, inventory value.

### 4. POS-Inventory Integration Tests (19 tests)
```bash
npm test -- src/features/__tests__/pos-inventory-integration.test.ts
```
Tests complete workflow: create transaction → delete transaction.

---

## Common Test Scenarios

### Test: "Sell 1 item → inventory decreases by 1"
```bash
npm test -- -t "should decrease inventory by 1"
```

### Test: "Sell 3 items → inventory decreases by 3"
```bash
npm test -- -t "should decrease inventory by 3"
```

### Test: "Delete sale → inventory increases"
```bash
npm test -- -t "should increase inventory"
```

### Test: "Multi-item sale"
```bash
npm test -- -t "multi-item"
```

### Test: "Complete workflow"
```bash
npm test -- -t "complete full workflow"
```

---

## Development Workflow

### While Working on Code
```bash
# Terminal 1: Keep tests running
npm test:watch

# Terminal 2: Your code editor
code .
```

When you save a file, tests automatically re-run!

### Before Committing
```bash
npm test                # All tests pass?
npm run type-check     # TypeScript types correct?
npm run lint           # Code style correct?
```

### Before Pushing
```bash
npm test:coverage      # Coverage maintained?
npm run build          # Production build works?
```

---

## Debugging Failed Tests

### See Full Error
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- -t "test name" --verbose
```

### See Which Tests Run
```bash
npm test -- --listTests
```

### See Test File
```bash
npm test -- --showConfig | grep testMatch
```

---

## Coverage Information

### Generate Coverage Report
```bash
npm test:coverage
```

### View Coverage (Console)
```bash
npm test:coverage | grep "coverage"
```

### Coverage Targets
```
Current: 100% of tested modules
- Taxes: 100%
- POS Calculations: 100%
- Inventory: 100%
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `TESTING_QUICK_START.md` | Quick reference |
| `TESTING_PHASE1.md` | Detailed implementation |
| `POS_INVENTORY_TESTS.md` | Integration test guide |
| `BUG_FIX_INVENTORY_RESTORATION.md` | Bug fix details |
| `TESTING_IMPLEMENTATION_SUMMARY.md` | Complete summary |
| `TESTING_COMMANDS.md` | This file |

---

## Test Structure

```
src/
├── features/
│   ├── taxes/
│   │   ├── services.ts
│   │   └── __tests__/
│   │       └── services.test.ts ✅
│   ├── inventory/
│   │   ├── services.ts
│   │   └── __tests__/
│   │       └── services.test.ts ✅
│   ├── pos/
│   │   ├── services.ts
│   │   ├── utils/
│   │   │   ├── calculations.ts
│   │   │   └── __tests__/
│   │   │       └── calculations.test.ts ✅
│   └── __tests__/
│       └── pos-inventory-integration.test.ts ✅
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm test:coverage
```

### GitLab CI Example
```yaml
test:
  image: node:18
  script:
    - npm install
    - npm test
    - npm test:coverage
```

---

## Useful npm Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

### Run These Before Each Step:

**Development:**
```bash
npm test:watch    # Keep running
```

**Testing Feature:**
```bash
npm test -- -t "feature name"
```

**Before Commit:**
```bash
npm test && npm run type-check && npm run lint
```

**Before Push:**
```bash
npm test:coverage && npm run build
```

**Before Deploy:**
```bash
npm test:coverage && npm run build && npm run type-check
```

---

## Troubleshooting

### Tests Won't Run
```bash
# Clear cache
npm test -- --clearCache

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Specific Test Not Running
```bash
# Check test name (must match exactly)
npm test -- --listTests

# Check if file exists
ls -la src/features/taxes/__tests__/services.test.ts
```

### Tests Running Slowly
```bash
# Run without coverage
npm test

# Run specific file only
npm test -- src/features/taxes
```

### Module Not Found
```bash
# Verify jest.config.ts has correct moduleNameMapper
cat jest.config.ts | grep moduleNameMapper

# Check @/ alias
grep "@/" jest.config.ts
```

---

## Performance

| Metric | Value |
|--------|-------|
| Total Tests | 68 |
| Execution Time | ~0.85s |
| Tests/Second | 79.4 |
| Status | ✅ Fast |

---

## What Tests Cover

### ✅ Covered
- Tax calculations
- POS calculations (financial accuracy!)
- Inventory validation
- Stock management
- Transaction workflows
- Multi-item sales
- Sale cancellations
- Edge cases

### ⏳ Not Yet Covered
- Payroll calculations
- Schedule/Attendance
- Roles/Permissions
- Component rendering
- API rate limiting
- Database transactions

---

## Next Testing Steps

### When Ready:
```bash
# Add Payroll tests
npm test -- src/features/payroll/__tests__/services.test.ts

# Add more integration tests
npm test -- src/features/__tests__/

# Add component tests
npm test -- src/components/__tests__/
```

---

## Questions?

See the main documentation files:
- **Quick overview:** `TESTING_QUICK_START.md`
- **Full guide:** `TESTING_PHASE1.md`
- **Integration details:** `POS_INVENTORY_TESTS.md`
- **Bug fix:** `BUG_FIX_INVENTORY_RESTORATION.md`

---

## 🎯 Summary

```bash
# All you need:
npm test              # Run tests
npm test:watch       # Develop
npm test:coverage    # Check coverage
```

**Done! Happy testing!** 🚀
