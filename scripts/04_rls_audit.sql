-- =============================================================================
-- scripts/04_rls_audit.sql
-- CHORE-006: RLS Isolation Audit — Cross-Gym Data Leakage Check
-- =============================================================================
-- PURPOSE:
--   Verify that Row Level Security correctly isolates data between tenants.
--   Run these queries in Supabase SQL Editor (as service_role / postgres) to
--   check raw counts per gym, then verify from the app with a logged-in user.
--
-- HOW TO USE:
--   PART A — Run as service_role in SQL Editor (bypasses RLS, shows full truth).
--   PART B — Instructions for browser-based app verification (uses RLS).
--
-- EXPECTED RESULTS (after running 03_seed_test_gym.sql):
--   Bodyline  (a1b2c3d4-0000-0000-0000-000000000001) — your real data
--   Iron Temple (b2c3d4e5-0000-0000-0000-000000000002) — seeded test data
--   plans=3, trainers=1, members=3, memberships=3, attendance=2, assignments=1
-- =============================================================================


-- =============================================================================
-- PART A: Service-Role Audit (run in Supabase SQL Editor)
-- =============================================================================
-- These queries bypass RLS. They confirm the raw DB state is correct before
-- testing that RLS filters it properly at the app layer.
-- =============================================================================


-- ----------------------------------------------------------------------------
-- A1. Confirm both gyms exist and are active
-- ----------------------------------------------------------------------------
SELECT id, name, slug, owner_email, is_active
FROM gyms
ORDER BY name;
-- Expected: 2 rows — Bodyline Fitness + Iron Temple, both is_active = true


-- ----------------------------------------------------------------------------
-- A2. Confirm both gym_settings rows exist
-- ----------------------------------------------------------------------------
SELECT gym_id, gym_display_name, city, primary_color, branches
FROM gym_settings
ORDER BY gym_display_name;
-- Expected: 2 rows


-- ----------------------------------------------------------------------------
-- A3. Row count per gym for every RLS-protected table
-- ----------------------------------------------------------------------------
SELECT
  'members'             AS tbl,
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001') AS bodyline,
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002') AS irontemple,
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  )) AS unknown_gym
FROM members
UNION ALL
SELECT
  'trainers',
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'),
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  ))
FROM trainers
UNION ALL
SELECT
  'membership_plans',
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'),
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  ))
FROM membership_plans
UNION ALL
SELECT
  'member_memberships',
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'),
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  ))
FROM member_memberships
UNION ALL
SELECT
  'attendance',
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'),
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  ))
FROM attendance
UNION ALL
SELECT
  'trainer_assignments',
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'),
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  ))
FROM trainer_assignments;
-- Expected: unknown_gym = 0 for ALL tables. No orphan rows.


-- ----------------------------------------------------------------------------
-- A4. RLS is enabled on all 8 tables
-- ----------------------------------------------------------------------------
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'gyms', 'gym_settings', 'members', 'trainers',
    'membership_plans', 'member_memberships',
    'attendance', 'trainer_assignments'
  )
ORDER BY tablename;
-- Expected: rls_enabled = true for all 8 rows


-- ----------------------------------------------------------------------------
-- A5. RLS policies exist for all 8 tables
-- ----------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'gyms', 'gym_settings', 'members', 'trainers',
    'membership_plans', 'member_memberships',
    'attendance', 'trainer_assignments'
  )
ORDER BY tablename, policyname;
-- Review: every table should have at minimum a gym_isolation policy + service_role bypass.


-- ----------------------------------------------------------------------------
-- A6. current_gym_id() and get_my_role() functions exist
-- ----------------------------------------------------------------------------
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('current_gym_id', 'get_my_role')
ORDER BY routine_name;
-- Expected: 2 rows. current_gym_id → SECURITY DEFINER, get_my_role → INVOKER


-- ----------------------------------------------------------------------------
-- A7. No NULL gym_id rows in any table (orphan check)
-- ----------------------------------------------------------------------------
SELECT 'members'             AS tbl, COUNT(*) AS null_gym_id FROM members             WHERE gym_id IS NULL
UNION ALL
SELECT 'trainers',             COUNT(*) FROM trainers             WHERE gym_id IS NULL
UNION ALL
SELECT 'membership_plans',     COUNT(*) FROM membership_plans     WHERE gym_id IS NULL
UNION ALL
SELECT 'member_memberships',   COUNT(*) FROM member_memberships   WHERE gym_id IS NULL
UNION ALL
SELECT 'attendance',           COUNT(*) FROM attendance           WHERE gym_id IS NULL
UNION ALL
SELECT 'trainer_assignments',  COUNT(*) FROM trainer_assignments  WHERE gym_id IS NULL;
-- Expected: 0 for all tables


-- =============================================================================
-- PART B: App-Layer RLS Verification (browser test instructions)
-- =============================================================================
-- These cannot be automated in SQL — they require logging in as each gym owner
-- and confirming the UI shows only that gym's data.
--
-- SETUP REQUIRED (once, before running this):
--   1. Supabase Dashboard → Auth → Users → Create user:
--      Email: owner@irontemple.in | Password: (your choice)
--      After creating → Edit → Raw app_metadata:
--      { "role": "owner", "gym_id": "b2c3d4e5-0000-0000-0000-000000000002" }
--      Save.
--
-- TEST 1 — Bodyline owner isolation
--   a. Open: http://localhost:3000/login?gym=bodyline
--   b. Log in as Bodyline owner
--   c. Navigate: Dashboard / Members / Payments / Attendance / Trainers
--   d. VERIFY: Zero Iron Temple members/trainers visible anywhere
--   e. Check DevTools → Network → Supabase responses, confirm row counts match Bodyline-only
--
-- TEST 2 — Iron Temple owner isolation
--   a. Open incognito: http://localhost:3000/login?gym=irontemple
--   b. Log in as owner@irontemple.in
--   c. Navigate: Dashboard / Members / Payments / Attendance / Trainers
--   d. VERIFY: Exactly 3 members (Arjun, Sneha, Rohit), 1 trainer (Vikram), 2 attendance rows
--   e. VERIFY: Zero Bodyline data visible anywhere
--
-- TEST 3 — Cross-contamination write test
--   a. While logged in as Iron Temple owner, add a new member
--   b. Switch to Bodyline owner — new member must NOT appear
--   c. While logged in as Bodyline owner, add a check-in
--   d. Switch to Iron Temple owner — check-in must NOT appear
--
-- TEST 4 — Pre-auth pages (anon access)
--   a. http://localhost:3000/login?gym=irontemple
--      → Left panel shows Iron Temple branding (blue accent, "Iron Temple", Bangalore)
--      → Member/Trainer counts show Iron Temple numbers
--   b. http://localhost:3000/onboarding?gym=irontemple
--      → Branch selector shows Koramangala / Indiranagar (Iron Temple branches)
--      → Plan selector shows Iron Temple plans (Monthly Grind / Quarter Beast / Annual Warrior)
--   c. http://localhost:3000/login?gym=bodyline
--      → Left panel shows Bodyline Fitness branding (green accent, Gurugram)
--      → Completely different stats and branding from Iron Temple
--
-- RECORD RESULTS in the walkthrough after running all tests.
-- =============================================================================
