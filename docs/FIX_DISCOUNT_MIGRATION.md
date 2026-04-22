# 🐛 FIX: Unknown Error When Completing a Sale

## Problem
When trying to complete a sale with a discount on the POS page, you get an "Unknown error" message.

## Root Cause
The `discount` column doesn't exist in the `transactions` table in your Supabase database. This column is required to store discount information for each sale.

Database error:
```
Could not find the 'discount' column of 'transactions' in the schema cache
```

## ✅ Solution

You need to add the `discount` column to the `transactions` table. Here are three ways to do it:

### **Method 1: Using Supabase Web Interface (Easiest)**

1. Go to https://app.supabase.com and log in
2. Select your project (Choco Rico)
3. Click **SQL Editor** in the left sidebar
4. Click the **New Query** button
5. Copy and paste this SQL:

```sql
ALTER TABLE transactions 
ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0 NOT NULL;
```

6. Click **Run** (or press Ctrl+Enter)
7. You should see: "execute query completed"

✅ **Done!** Now try completing a sale again.

### **Method 2: Using pgAdmin (Direct Database Access)**

1. In Supabase, click on your project
2. Click **Settings** → **Database**
3. Click **Connection Info** to see your database details
4. Open pgAdmin (or DBeaver, DataGrip, etc.)
5. Connect to your Supabase database
6. Run the same SQL query as Method 1

### **Method 3: Verify Migration Was Successful**

After running the SQL, verify it worked by running this query:

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;
```

You should see a `discount` column with data type `numeric`.

---

## 🚀 Next Steps

1. **Apply the migration** using one of the methods above
2. **Refresh your browser** (press F5 or Ctrl+R)
3. **Try completing a sale again** with a discount
4. The transaction should now save successfully with the discount amount

---

## 📋 What the `discount` Column Does

- Stores the discount amount applied to each transaction
- Data type: `NUMERIC(10, 2)` (up to 10 digits, 2 decimal places)
- Default value: 0 (no discount)
- Enables:
  - Discount calculations on the POS page
  - Discount display in transaction list
  - Discount viewing in transaction detail modal
  - Discount reporting and analysis

---

## ❓ Still Having Issues?

1. **Check if the column was added:**
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'transactions' AND column_name = 'discount';
   ```
   If empty, the migration didn't work.

2. **Clear browser cache:**
   - Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Select "All Time"
   - Click "Clear Data"

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Check server logs:**
   Look at the terminal where `npm run dev` is running for any error messages

---

## 📚 Related Files

- Migration SQL: `docs/sql/add_discount_column.sql`
- Migration Instructions: `DISCOUNT_MIGRATION.md`
- Transaction API: `src/app/api/tenants/[tenantId]/transactions/route.ts`
- POS Page: `src/app/dashboard/pos/page.tsx`
