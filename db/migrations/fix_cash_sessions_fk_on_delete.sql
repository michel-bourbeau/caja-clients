-- ============================================================
-- Migration: Add ON DELETE SET NULL to cash_sessions and
--            cash_session_recounts foreign keys referencing employees
--
-- Problem: opened_by_id, closed_by_id (cash_sessions) and
--          recounted_by_id (cash_session_recounts) had no delete rule,
--          causing a FK violation when deleting an employee that ever
--          opened/closed/recounted a session.
--
-- Fix: Recreate those constraints with ON DELETE SET NULL so that
--      deleting an employee automatically nullifies the reference.
-- ============================================================

-- 1. cash_sessions.opened_by_id
ALTER TABLE cash_sessions
  DROP CONSTRAINT IF EXISTS cash_sessions_opened_by_id_fkey;

ALTER TABLE cash_sessions
  ADD CONSTRAINT cash_sessions_opened_by_id_fkey
    FOREIGN KEY (opened_by_id)
    REFERENCES employees(id)
    ON DELETE SET NULL;

-- 2. cash_sessions.closed_by_id
ALTER TABLE cash_sessions
  DROP CONSTRAINT IF EXISTS cash_sessions_closed_by_id_fkey;

ALTER TABLE cash_sessions
  ADD CONSTRAINT cash_sessions_closed_by_id_fkey
    FOREIGN KEY (closed_by_id)
    REFERENCES employees(id)
    ON DELETE SET NULL;

-- 3. cash_session_recounts.recounted_by_id
ALTER TABLE cash_session_recounts
  DROP CONSTRAINT IF EXISTS cash_session_recounts_recounted_by_id_fkey;

ALTER TABLE cash_session_recounts
  ADD CONSTRAINT cash_session_recounts_recounted_by_id_fkey
    FOREIGN KEY (recounted_by_id)
    REFERENCES employees(id)
    ON DELETE SET NULL;
