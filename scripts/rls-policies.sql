-- =============================================================================
-- Bodyline Gym — Supabase Row Level Security (RLS) Policies
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → Paste → Run
--
-- Role mapping (set in user_metadata.role at sign-up via seed-auth.ts):
--   owner   → pradeep@bodyline.in — full read/write on everything
--   trainer → karthik / divya / suresh — read their own assignments & bookings
--   member  → any gym member with a Supabase auth account — read own data only
--   anon    → unauthenticated — only public plan list (for onboarding page)
-- =============================================================================

-- Helper: extract role from JWT user_metadata
-- Usage: get_my_role() = 'owner'
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anon'
  );
$$;

-- Helper: get the trainer row id for the currently logged-in trainer
CREATE OR REPLACE FUNCTION get_my_trainer_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM trainers
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$;

-- Helper: get the member row id for the currently logged-in member
CREATE OR REPLACE FUNCTION get_my_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM members
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$;

-- =============================================================================
-- 1. membership_plans
--    Public read (anon needs this for the onboarding page)
--    Owner can insert/update/delete
-- =============================================================================

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_all"   ON membership_plans;
DROP POLICY IF EXISTS "plans_owner_insert" ON membership_plans;
DROP POLICY IF EXISTS "plans_owner_update" ON membership_plans;
DROP POLICY IF EXISTS "plans_owner_delete" ON membership_plans;

-- Anyone (including unauthenticated visitors) can view active plans
CREATE POLICY "plans_select_all"
  ON membership_plans FOR SELECT
  USING (true);

-- Only owner can create/update/delete plans
CREATE POLICY "plans_owner_insert"
  ON membership_plans FOR INSERT
  WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "plans_owner_update"
  ON membership_plans FOR UPDATE
  USING (get_my_role() = 'owner');

CREATE POLICY "plans_owner_delete"
  ON membership_plans FOR DELETE
  USING (get_my_role() = 'owner');


-- =============================================================================
-- 2. members
--    owner  → full CRUD
--    trainer→ read members assigned to them via trainer_assignments
--    member → read their own row only
--    anon   → INSERT only (onboarding self-registration), no read
-- =============================================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_owner_all"     ON members;
DROP POLICY IF EXISTS "members_trainer_read"  ON members;
DROP POLICY IF EXISTS "members_self_read"     ON members;
DROP POLICY IF EXISTS "members_anon_insert"   ON members;
DROP POLICY IF EXISTS "members_owner_update"  ON members;

-- Owner: full access
CREATE POLICY "members_owner_all"
  ON members FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Trainer: read only the members assigned to them
CREATE POLICY "members_trainer_read"
  ON members FOR SELECT
  USING (
    get_my_role() = 'trainer'
    AND id IN (
      SELECT member_id FROM trainer_assignments
      WHERE trainer_id = get_my_trainer_id()
      AND is_current = true
    )
  );

-- Member: read their own profile only
CREATE POLICY "members_self_read"
  ON members FOR SELECT
  USING (
    get_my_role() = 'member'
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Anon: insert only (onboarding form creates a new member row)
CREATE POLICY "members_anon_insert"
  ON members FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');


-- =============================================================================
-- 3. trainers
--    owner   → full CRUD
--    trainer → read all trainers (needed to populate booking dropdowns)
--    member  → read all active trainers (booking form on member portal)
--    anon    → read all active trainers (onboarding booking form)
-- =============================================================================

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainers_owner_all"    ON trainers;
DROP POLICY IF EXISTS "trainers_read_active"  ON trainers;

-- Owner: full access
CREATE POLICY "trainers_owner_all"
  ON trainers FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Everyone authenticated (trainer / member) can read all trainers
-- Anon can also read active trainers for the booking dropdown in onboarding
CREATE POLICY "trainers_read_active"
  ON trainers FOR SELECT
  USING (
    get_my_role() IN ('trainer', 'member')
    OR (auth.role() = 'anon' AND is_active = true)
  );


-- =============================================================================
-- 4. member_memberships
--    owner   → full CRUD
--    trainer → read memberships of their assigned members
--    member  → read their own memberships
--    anon    → insert only (onboarding creates the first membership)
-- =============================================================================

ALTER TABLE member_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mm_owner_all"       ON member_memberships;
DROP POLICY IF EXISTS "mm_trainer_read"    ON member_memberships;
DROP POLICY IF EXISTS "mm_self_read"       ON member_memberships;
DROP POLICY IF EXISTS "mm_anon_insert"     ON member_memberships;

-- Owner: full access
CREATE POLICY "mm_owner_all"
  ON member_memberships FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Trainer: read memberships of assigned members only
CREATE POLICY "mm_trainer_read"
  ON member_memberships FOR SELECT
  USING (
    get_my_role() = 'trainer'
    AND member_id IN (
      SELECT member_id FROM trainer_assignments
      WHERE trainer_id = get_my_trainer_id()
      AND is_current = true
    )
  );

-- Member: read their own membership records
CREATE POLICY "mm_self_read"
  ON member_memberships FOR SELECT
  USING (
    get_my_role() = 'member'
    AND member_id = get_my_member_id()
  );

-- Anon: insert (onboarding self-registration)
CREATE POLICY "mm_anon_insert"
  ON member_memberships FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');


-- =============================================================================
-- 5. attendance
--    owner   → full CRUD (check-in desk, dashboard)
--    trainer → read attendance of their assigned members
--    member  → read their own attendance only
--    anon    → no access
-- =============================================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_owner_all"      ON attendance;
DROP POLICY IF EXISTS "att_trainer_read"   ON attendance;
DROP POLICY IF EXISTS "att_self_read"      ON attendance;

-- Owner: full access
CREATE POLICY "att_owner_all"
  ON attendance FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Trainer: read attendance of assigned members
CREATE POLICY "att_trainer_read"
  ON attendance FOR SELECT
  USING (
    get_my_role() = 'trainer'
    AND member_id IN (
      SELECT member_id FROM trainer_assignments
      WHERE trainer_id = get_my_trainer_id()
      AND is_current = true
    )
  );

-- Member: read their own attendance
CREATE POLICY "att_self_read"
  ON attendance FOR SELECT
  USING (
    get_my_role() = 'member'
    AND member_id = get_my_member_id()
  );


-- =============================================================================
-- 6. trainer_assignments
--    owner   → full CRUD
--    trainer → read their own assignments
--    member  → read assignments where they are the member (to see their trainer)
--    anon    → no access
-- =============================================================================

ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ta_owner_all"       ON trainer_assignments;
DROP POLICY IF EXISTS "ta_trainer_read"    ON trainer_assignments;
DROP POLICY IF EXISTS "ta_member_read"     ON trainer_assignments;

-- Owner: full access
CREATE POLICY "ta_owner_all"
  ON trainer_assignments FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Trainer: read their own assignments
CREATE POLICY "ta_trainer_read"
  ON trainer_assignments FOR SELECT
  USING (
    get_my_role() = 'trainer'
    AND trainer_id = get_my_trainer_id()
  );

-- Member: read assignments where they are the member
CREATE POLICY "ta_member_read"
  ON trainer_assignments FOR SELECT
  USING (
    get_my_role() = 'member'
    AND member_id = get_my_member_id()
  );


-- =============================================================================
-- 7. bookings
--    owner   → full CRUD
--    trainer → read & update (confirm/cancel) bookings assigned to them
--    member  → read their own bookings, insert new bookings
--    anon    → no access
-- =============================================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_owner_all"         ON bookings;
DROP POLICY IF EXISTS "book_trainer_read"      ON bookings;
DROP POLICY IF EXISTS "book_trainer_update"    ON bookings;
DROP POLICY IF EXISTS "book_member_read"       ON bookings;
DROP POLICY IF EXISTS "book_member_insert"     ON bookings;

-- Owner: full access
CREATE POLICY "book_owner_all"
  ON bookings FOR ALL
  USING (get_my_role() = 'owner')
  WITH CHECK (get_my_role() = 'owner');

-- Trainer: read their own bookings
CREATE POLICY "book_trainer_read"
  ON bookings FOR SELECT
  USING (
    get_my_role() = 'trainer'
    AND trainer_id = get_my_trainer_id()
  );

-- Trainer: update status on their own bookings (confirm / cancel)
CREATE POLICY "book_trainer_update"
  ON bookings FOR UPDATE
  USING (
    get_my_role() = 'trainer'
    AND trainer_id = get_my_trainer_id()
  );

-- Member: read their own bookings
CREATE POLICY "book_member_read"
  ON bookings FOR SELECT
  USING (
    get_my_role() = 'member'
    AND member_id = get_my_member_id()
  );

-- Member: insert new bookings for themselves only
CREATE POLICY "book_member_insert"
  ON bookings FOR INSERT
  WITH CHECK (
    get_my_role() = 'member'
    AND member_id = get_my_member_id()
  );


-- =============================================================================
-- Verification: list all enabled RLS policies
-- =============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
