-- Add recurring_frequency column to expenses table
-- Allows storing the frequency of recurring expenses: weekly, biweekly, monthly

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT;

-- Add a comment/constraint for the recurring_frequency values
-- Valid values: 'weekly', 'biweekly', 'monthly'
ALTER TABLE expenses
ADD CONSTRAINT check_recurring_frequency 
CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('weekly', 'biweekly', 'monthly'));
