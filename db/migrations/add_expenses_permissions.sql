-- Add all expenses permissions to admin role
UPDATE tenant_roles
SET permissions = array_cat(
  permissions,
  ARRAY['expenses.create','expenses.view_all','expenses.view_own','expenses.edit','expenses.manage_suppliers']
  -- Remove duplicates by keeping only values not already present
  ::text[] -- cast needed for array_cat
)
WHERE slug = 'admin'
  AND NOT ('expenses.view_all' = ANY(permissions));

-- Also add view_all + edit to manager role
UPDATE tenant_roles
SET permissions = array_cat(
  permissions,
  ARRAY['expenses.view_all','expenses.view_own','expenses.create','expenses.edit']::text[]
)
WHERE slug = 'manager'
  AND NOT ('expenses.view_all' = ANY(permissions));
