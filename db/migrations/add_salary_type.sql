-- Add salary_type column to employees table
-- Supports both hourly and monthly salaries
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'monthly'));

-- Add comment explaining the field
COMMENT ON COLUMN employees.salary_type IS 'Type of salary: "hourly" for hourly rate, "monthly" for fixed monthly salary';
