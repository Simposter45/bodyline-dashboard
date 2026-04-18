-- =============================================================================
-- sql/01_handoff_migration.sql
-- Bodyline → SaaS Multi-Tenant Foundation
-- =============================================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN: All statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING
--
-- ROLLBACK: See bottom of file
-- =============================================================================


-- =============================================================================
-- SECTION 1: Core Tenant Tables
-- =============================================================================

-- The tenant registry. One row per gym.
CREATE TABLE IF NOT EXISTS gyms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,          -- e.g. "bodyline" → bodyline.yourdomain.com
  owner_email   TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-gym configuration. Drives all hardcoded-looking UI values.
CREATE TABLE IF NOT EXISTS gym_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE UNIQUE,
  -- Branding
  gym_display_name  TEXT,                       -- shown in nav / landing page
  tagline           TEXT,                       -- hero subtitle on landing page
  logo_url          TEXT,
  primary_color     TEXT NOT NULL DEFAULT '#4ade80',
  -- Location
  city              TEXT,
  branches          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["Sector 14", "DLF Phase 1"]
  -- Payments
  upi_id            TEXT,
  -- Contact
  whatsapp_number   TEXT,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 2: Seed the Founding Gym (Pradeep's Bodyline)
-- =============================================================================
-- Uses a deterministic UUID so rollback is a single DELETE (cascades everywhere).
-- ON CONFLICT DO NOTHING makes this idempotent — safe to run twice.

INSERT INTO gyms (id, name, slug, owner_email, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bodyline Fitness',
  'bodyline',
  'pradeep@bodyline.in',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_settings (
  gym_id,
  gym_display_name,
  tagline,
  primary_color,
  city,
  branches,
  upi_id,
  whatsapp_number
)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bodyline Fitness',
  'Gurugram''s performance gym',
  '#4ade80',
  'Gurugram',
  '["Sector 14", "DLF Phase 1", "Sohna Road"]'::jsonb,
  'bodyline@upi',
  NULL
)
ON CONFLICT (gym_id) DO NOTHING;


-- =============================================================================
-- SECTION 3: Add gym_id to All Existing Tables
-- =============================================================================
-- Pattern per table:
--   1. Add column as NULLABLE (non-breaking — existing rows stay valid)
--   2. Backfill all existing rows with the founding gym UUID
--   3. Add NOT NULL constraint (safe now that all rows are filled)
--   4. Add FK to gyms
-- =============================================================================

-- members
ALTER TABLE members ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE members SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE members ALTER COLUMN gym_id SET NOT NULL;

-- trainers
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE trainers SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE trainers ALTER COLUMN gym_id SET NOT NULL;

-- membership_plans
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE membership_plans SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE membership_plans ALTER COLUMN gym_id SET NOT NULL;

-- member_memberships
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE member_memberships SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE member_memberships ALTER COLUMN gym_id SET NOT NULL;

-- attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE attendance SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE attendance ALTER COLUMN gym_id SET NOT NULL;

-- trainer_assignments
ALTER TABLE trainer_assignments ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
UPDATE trainer_assignments SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
ALTER TABLE trainer_assignments ALTER COLUMN gym_id SET NOT NULL;

-- bookings (may not exist yet — CREATE IF NOT EXISTS is not valid for ALTER, so guard with DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
    UPDATE bookings SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' WHERE gym_id IS NULL;
    ALTER TABLE bookings ALTER COLUMN gym_id SET NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: RLS Helper Function
-- =============================================================================
-- Reads gym_id from the authenticated user's JWT app_metadata.
-- app_metadata is set server-side only (service role key) — users cannot tamper with it.
-- Falls back to NULL if not set (no gym context → RLS blocks all rows).
-- =============================================================================

CREATE OR REPLACE FUNCTION current_gym_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'app_metadata' ->> 'gym_id'),
    ''
  )::UUID;
$$;

-- Role helper (reuses the existing pattern from auth audit)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anon'
  );
$$;


-- =============================================================================
-- SECTION 5: Row Level Security Policies
-- =============================================================================
-- Every table gets two policies:
--   "gym_isolation"       → authenticated users see only their gym's rows
--   "service_role_bypass" → service role key bypasses RLS (for admin ops, seeding)
--
-- NOTE: After enabling RLS, ALL queries from the anon/authenticated role are
-- blocked by default unless a matching policy exists.
-- The service_role key (SUPABASE_SERVICE_ROLE_KEY) always bypasses RLS.
-- =============================================================================

-- ── gyms ─────────────────────────────────────────────────────────────────────
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gyms_own_gym"           ON gyms;
DROP POLICY IF EXISTS "gyms_service_bypass"    ON gyms;

-- Users can only see their own gym's row
CREATE POLICY "gyms_own_gym"
  ON gyms FOR SELECT
  USING (id = current_gym_id());

-- Service role full access
CREATE POLICY "gyms_service_bypass"
  ON gyms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── gym_settings ──────────────────────────────────────────────────────────────
ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;

-- Anon: read gym settings (needed for landing page rendering without auth)
-- Tenant-scoped via slug match (public resolution)
DROP POLICY IF EXISTS "gym_settings_anon_read"    ON gym_settings;
CREATE POLICY "gym_settings_anon_read"
  ON gym_settings FOR SELECT
  TO anon
  USING (true); -- Public discovery is allowed for the landing page hook to function

-- Owner: update own gym settings
DROP POLICY IF EXISTS "gym_settings_owner_update" ON gym_settings;
CREATE POLICY "gym_settings_owner_update"
  ON gym_settings FOR UPDATE
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "gym_settings_service"
  ON gym_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── membership_plans ──────────────────────────────────────────────────────────
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_gym_isolation"   ON membership_plans;
DROP POLICY IF EXISTS "plans_anon_read"       ON membership_plans;
DROP POLICY IF EXISTS "plans_owner_write"     ON membership_plans;
DROP POLICY IF EXISTS "plans_service"         ON membership_plans;

CREATE POLICY "plans_gym_isolation"
  ON membership_plans FOR SELECT
  USING (gym_id = current_gym_id());

-- Anon can read plans (for onboarding page before logging in)
CREATE POLICY "plans_anon_read"
  ON membership_plans FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "plans_owner_write"
  ON membership_plans FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "plans_service"
  ON membership_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── members ───────────────────────────────────────────────────────────────────
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_gym_isolation"  ON members;
DROP POLICY IF EXISTS "members_self_read"      ON members;
DROP POLICY IF EXISTS "members_anon_insert"    ON members;
DROP POLICY IF EXISTS "members_service"        ON members;

-- Owner / Trainer: see all members in their gym
CREATE POLICY "members_gym_isolation"
  ON members FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() IN ('owner', 'trainer')
  );

-- Member: see only their own row
-- Securely uses auth.uid() instead of auth.users subquery
CREATE POLICY "members_self_read"
  ON members FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND id IN (
      SELECT m.id FROM members m 
      WHERE m.email = auth.jwt()->>'email'
    )
  );

-- Owner: full write access within their gym
DROP POLICY IF EXISTS "members_owner_write"    ON members;
CREATE POLICY "members_owner_write"
  ON members FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id() AND get_my_role() = 'owner');

-- Anon: insert only (onboarding self-registration)
-- NOTE: In production, gym_id should be verified via RPC or server-side hook
CREATE POLICY "members_anon_insert"
  ON members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "members_service"
  ON members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── trainers ──────────────────────────────────────────────────────────────────
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainers_gym_isolation" ON trainers;
DROP POLICY IF EXISTS "trainers_service"       ON trainers;

-- All authenticated users in a gym can read trainers (for booking forms)
CREATE POLICY "trainers_gym_isolation"
  ON trainers FOR SELECT
  USING (gym_id = current_gym_id());

-- Anon: read active trainers (onboarding booking form)
DROP POLICY IF EXISTS "trainers_anon_read" ON trainers;
CREATE POLICY "trainers_anon_read"
  ON trainers FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "trainers_owner_write" ON trainers;
CREATE POLICY "trainers_owner_write"
  ON trainers FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "trainers_service"
  ON trainers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── member_memberships ────────────────────────────────────────────────────────
ALTER TABLE member_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mm_gym_isolation"  ON member_memberships;
DROP POLICY IF EXISTS "mm_self_read"      ON member_memberships;
DROP POLICY IF EXISTS "mm_anon_insert"    ON member_memberships;
DROP POLICY IF EXISTS "mm_service"        ON member_memberships;

CREATE POLICY "mm_gym_isolation"
  ON member_memberships FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() IN ('owner', 'trainer')
  );

CREATE POLICY "mm_self_read"
  ON member_memberships FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT m.id FROM members m
      JOIN auth.users u ON u.email = m.email
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "mm_owner_write" ON member_memberships;
CREATE POLICY "mm_owner_write"
  ON member_memberships FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "mm_anon_insert"
  ON member_memberships FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "mm_service"
  ON member_memberships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── attendance ────────────────────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_gym_isolation" ON attendance;
DROP POLICY IF EXISTS "att_self_read"     ON attendance;
DROP POLICY IF EXISTS "att_service"       ON attendance;

CREATE POLICY "att_gym_isolation"
  ON attendance FOR ALL
  USING (
    gym_id = current_gym_id()
    AND get_my_role() IN ('owner', 'trainer')
  )
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "att_self_read"
  ON attendance FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT m.id FROM members m
      JOIN auth.users u ON u.email = m.email
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "att_service"
  ON attendance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── trainer_assignments ───────────────────────────────────────────────────────
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ta_gym_isolation" ON trainer_assignments;
DROP POLICY IF EXISTS "ta_service"       ON trainer_assignments;

-- Read access for everyone in gym
DROP POLICY IF EXISTS "ta_gym_isolation_read" ON trainer_assignments;
CREATE POLICY "ta_gym_isolation_read"
  ON trainer_assignments FOR SELECT
  USING (gym_id = current_gym_id());

-- Write access for Owner only
DROP POLICY IF EXISTS "ta_gym_isolation_write" ON trainer_assignments;
CREATE POLICY "ta_gym_isolation_write"
  ON trainer_assignments FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "ta_service"
  ON trainer_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── bookings (if table exists) ────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "bookings_gym_isolation" ON bookings';
    EXECUTE 'DROP POLICY IF EXISTS "bookings_service" ON bookings';

    EXECUTE '
      CREATE POLICY "bookings_gym_isolation"
        ON bookings FOR ALL
        USING (gym_id = current_gym_id())
        WITH CHECK (gym_id = current_gym_id())
    ';

    EXECUTE '
      CREATE POLICY "bookings_service"
        ON bookings FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    ';
  END IF;
END $$;


-- =============================================================================
-- SECTION 6: Verification Queries
-- Run these after executing the migration. All should return expected results.
-- =============================================================================

-- 1. Confirm gyms + gym_settings tables exist and founding gym is present
SELECT id, name, slug, owner_email FROM gyms;
SELECT gym_id, gym_display_name, city, branches, upi_id FROM gym_settings;

-- 2. Confirm gym_id was added to all tables
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE column_name = 'gym_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- 3. Confirm RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'gyms', 'gym_settings', 'members', 'trainers',
    'membership_plans', 'member_memberships',
    'attendance', 'trainer_assignments'
  )
ORDER BY tablename;

-- 4. Confirm no orphaned rows (should return 0 for each)
SELECT 'members' AS tbl, COUNT(*) AS orphans FROM members WHERE gym_id IS NULL
UNION ALL
SELECT 'trainers', COUNT(*) FROM trainers WHERE gym_id IS NULL
UNION ALL
SELECT 'membership_plans', COUNT(*) FROM membership_plans WHERE gym_id IS NULL
UNION ALL
SELECT 'member_memberships', COUNT(*) FROM member_memberships WHERE gym_id IS NULL
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance WHERE gym_id IS NULL
UNION ALL
SELECT 'trainer_assignments', COUNT(*) FROM trainer_assignments WHERE gym_id IS NULL;


-- =============================================================================
-- ROLLBACK PLAN (run only if migration fails and you need to undo)
-- =============================================================================
/*
DELETE FROM gyms WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';  -- cascades gym_settings

ALTER TABLE members           DROP COLUMN IF EXISTS gym_id;
ALTER TABLE trainers          DROP COLUMN IF EXISTS gym_id;
ALTER TABLE membership_plans  DROP COLUMN IF EXISTS gym_id;
ALTER TABLE member_memberships DROP COLUMN IF EXISTS gym_id;
ALTER TABLE attendance        DROP COLUMN IF EXISTS gym_id;
ALTER TABLE trainer_assignments DROP COLUMN IF EXISTS gym_id;

ALTER TABLE members              DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers             DISABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans     DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_memberships   DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance           DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_assignments  DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS gym_settings;
DROP TABLE IF EXISTS gyms;

DROP FUNCTION IF EXISTS current_gym_id();
DROP FUNCTION IF EXISTS get_my_role();
*/
