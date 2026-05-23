-- =============================================================================
-- scripts/05_tighten_anon_rls.sql
-- CHORE-006: Tighten Anonymous Row Level Security Policies
-- =============================================================================
-- PURPOSE:
--   Prevent cross-gym data leakage by anonymous (pre-auth) users.
--   Ensure that anonymous reads and inserts are restricted strictly to active gyms.
-- =============================================================================

BEGIN;

-- 1. Tighten membership_plans anonymous read
-- Old: USING (true)
-- New: Restrict to active gyms only
DROP POLICY IF EXISTS "plans_anon_read" ON membership_plans;
CREATE POLICY "plans_anon_read"
  ON membership_plans FOR SELECT
  TO anon
  USING (
    gym_id IN (SELECT id FROM gyms WHERE is_active = true)
  );

-- 2. Tighten trainers anonymous read
-- Old: USING (is_active = true)
-- New: Restrict to active trainers belonging to active gyms
DROP POLICY IF EXISTS "trainers_anon_read" ON trainers;
CREATE POLICY "trainers_anon_read"
  ON trainers FOR SELECT
  TO anon
  USING (
    is_active = true
    AND gym_id IN (SELECT id FROM gyms WHERE is_active = true)
  );

-- 3. Tighten members anonymous insert (onboarding self-registration)
-- Old: WITH CHECK (true)
-- New: Restrict inserts to active gyms only
DROP POLICY IF EXISTS "members_anon_insert" ON members;
CREATE POLICY "members_anon_insert"
  ON members FOR INSERT
  TO anon
  WITH CHECK (
    gym_id IN (SELECT id FROM gyms WHERE is_active = true)
  );

-- 4. Tighten member_memberships anonymous insert (onboarding self-registration)
-- Old: WITH CHECK (true)
-- New: Restrict inserts to active gyms only
DROP POLICY IF EXISTS "mm_anon_insert" ON member_memberships;
CREATE POLICY "mm_anon_insert"
  ON member_memberships FOR INSERT
  TO anon
  WITH CHECK (
    gym_id IN (SELECT id FROM gyms WHERE is_active = true)
  );

COMMIT;
