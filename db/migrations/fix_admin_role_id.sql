-- Fix system users (admins) with null role_id
-- These were created without role_id set in the database
UPDATE users 
SET role_id = 'admin'
WHERE role_id IS NULL
  AND id IN (
    SELECT id FROM users 
    WHERE tenant_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
  );

