-- Add pos.cierre and pos.cierre_review to existing tenant admin/manager roles in DB
-- Run this in Supabase SQL Editor

UPDATE tenant_roles
SET permissions = array_append(permissions, 'pos.cierre')
WHERE 'pos.cierre' != ALL(permissions);

UPDATE tenant_roles
SET permissions = array_append(permissions, 'pos.cierre_review')
WHERE slug IN ('admin', 'manager')
  AND 'pos.cierre_review' != ALL(permissions);
