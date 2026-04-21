-- Add payroll configuration to tenant_settings
-- frequency: weekly | biweekly | monthly
-- weekStartDay: 0=Sunday, 1=Monday, ..., 6=Saturday  (used for weekly/biweekly)
-- monthStartDay: 1-28  (used for monthly — day of month the period starts)

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS payroll_config jsonb NOT NULL DEFAULT '{"frequency":"weekly","weekStartDay":1,"monthStartDay":1}';
