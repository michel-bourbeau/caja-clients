-- Add reports.view and reports.export permissions to existing roles in the database

-- Add reports.view to all admin roles
UPDATE tenant_roles 
SET permissions = array_append(permissions, 'reports.view')
WHERE 'reports.view' != ALL(permissions)
  AND slug IN ('admin', 'manager');

-- Add reports.export to all admin and manager roles
UPDATE tenant_roles 
SET permissions = array_append(permissions, 'reports.export')
WHERE 'reports.export' != ALL(permissions)
  AND slug IN ('admin', 'manager');
