# Migration: Add Discount Column to Transactions

## Issue
The discount feature requires a `discount` column in the `transactions` table, but this column doesn't exist in the database schema.

## Solution
Run the following SQL in your Supabase SQL editor:

```sql
ALTER TABLE transactions 
ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0 NOT NULL;
```

## Steps to Execute

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to the **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL above
5. Click **Run** or press Ctrl+Enter
6. Refresh the page and try completing a sale again

## Alternative: Using pgAdmin

If you prefer using pgAdmin:
1. Open your Supabase pgAdmin interface
2. Connect to your database
3. Open a Query Tool on the `transactions` table
4. Run the SQL above

## Verification

After running the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'discount';
```

You should see:
- `column_name`: discount
- `data_type`: numeric

## What This Does

- Adds a new `discount` NUMERIC column (10 digits, 2 decimal places)
- Sets default value to 0
- Made NOT NULL for consistency
- Stores the discount amount for each transaction
