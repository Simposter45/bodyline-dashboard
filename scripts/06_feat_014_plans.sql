-- ==============================================================================
-- FEAT-014: Membership Plan Manager
-- Migration: Add freeze tracking columns
-- ==============================================================================

-- 1. Add max_freeze_days to membership_plans
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS max_freeze_days INTEGER NOT NULL DEFAULT 0;

-- 2. Add freeze tracking columns to member_memberships
ALTER TABLE member_memberships
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paused_until DATE DEFAULT NULL;

-- 3. Update Supabase Realtime (optional but safe)
-- If these tables are used in Realtime, the columns will be picked up automatically.
