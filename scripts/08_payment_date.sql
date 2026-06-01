-- ==============================================================================
-- 08_payment_date.sql
-- Adds last_payment_at to member_memberships so "This month" and the
-- Revenue Health Graph bucket by WHEN money was collected, not when the
-- membership period was created (created_at).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS / conditional backfill
-- ==============================================================================


-- 1. Add the column (nullable — existing rows have no payment date recorded)
ALTER TABLE member_memberships
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;


-- 2. Backfill existing rows that already have money recorded against them.
--    Best approximation: use created_at as the payment date since we have no
--    better timestamp for historical records.
--    Only backfill rows with amount_paid > 0 (i.e. money was actually received).
UPDATE member_memberships
SET    last_payment_at = created_at
WHERE  amount_paid > 0
  AND  last_payment_at IS NULL;


-- 3. Add an index so "this month" queries on last_payment_at are fast
CREATE INDEX IF NOT EXISTS idx_mm_last_payment_at
  ON member_memberships (gym_id, last_payment_at DESC)
  WHERE last_payment_at IS NOT NULL;


-- 4. Verify — should show the new column
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_name   = 'member_memberships'
  AND  column_name  = 'last_payment_at'
  AND  table_schema = 'public';
