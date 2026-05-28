-- ==============================================================================
-- FEAT-010: Trainer Portal Rebuild — Database Schema
-- Migration: Trainer auth linking, Trainer Attendance, Session Logs, Payment tag
-- ==============================================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN: All statements use IF NOT EXISTS / DROP ... IF EXISTS
--
-- ROLLBACK: See bottom of file
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: Link trainers table to their Supabase auth user
-- ==============================================================================
-- Enables trainer self-identification inside the portal without an email lookup.
-- Set via the owner's "Provision Login" flow (app/api/trainer/provision).
-- NULL means no portal login has been provisioned for this trainer yet.
-- ==============================================================================

ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS trainer_auth_user_id UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Index for fast lookup: used by useTrainerSelf hook on every portal load
CREATE INDEX IF NOT EXISTS idx_trainers_auth_user
  ON trainers(trainer_auth_user_id)
  WHERE trainer_auth_user_id IS NOT NULL;

-- Trainer: update their own profile fields (name, phone, specialization, photo)
-- Owner retains full write access via the existing "trainers_owner_write" policy
DROP POLICY IF EXISTS "trainers_self_update" ON trainers;
CREATE POLICY "trainers_self_update"
  ON trainers FOR UPDATE
  USING (
    trainer_auth_user_id = auth.uid()
    AND gym_id = current_gym_id()
  )
  WITH CHECK (
    trainer_auth_user_id = auth.uid()
    AND gym_id = current_gym_id()
  );


-- ==============================================================================
-- SECTION 2: trainer_attendance table
-- ==============================================================================
-- Tracks trainer clock-in / clock-out events.
-- Separate from the member `attendance` table to avoid role-based query confusion.
-- One open row per trainer per day (clock_out = NULL while clocked in).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS trainer_attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id  UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  date        DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce: one open clock-in per trainer per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_attendance_one_open
  ON trainer_attendance(trainer_id, date)
  WHERE clock_out IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainer_attendance_trainer_date
  ON trainer_attendance(trainer_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_trainer_attendance_gym_date
  ON trainer_attendance(gym_id, date DESC);

-- RLS
ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;

-- Trainer: full control over their own rows
DROP POLICY IF EXISTS "ta_att_self_rw" ON trainer_attendance;
CREATE POLICY "ta_att_self_rw"
  ON trainer_attendance FOR ALL
  USING (
    trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
    AND gym_id = current_gym_id()
  )
  WITH CHECK (
    trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
    AND gym_id = current_gym_id()
  );

-- Owner: read all trainer attendance in their gym
DROP POLICY IF EXISTS "ta_att_owner_read" ON trainer_attendance;
CREATE POLICY "ta_att_owner_read"
  ON trainer_attendance FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'owner'
  );

-- Service role bypass
DROP POLICY IF EXISTS "ta_att_service" ON trainer_attendance;
CREATE POLICY "ta_att_service"
  ON trainer_attendance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- SECTION 3: session_logs table
-- ==============================================================================
-- Records PT / group / rehab sessions that a trainer logs with their members.
-- Replaces the aspirational (and non-existent) `bookings` table concept.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS session_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id    UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_date  DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
  session_type  TEXT        NOT NULL DEFAULT 'personal_training'
                              CHECK (session_type IN (
                                'personal_training',
                                'group',
                                'rehab',
                                'open_gym'
                              )),
  duration_mins INTEGER     CHECK (duration_mins > 0 AND duration_mins <= 480),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_logs_trainer_date
  ON session_logs(trainer_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_member
  ON session_logs(member_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_gym_date
  ON session_logs(gym_id, session_date DESC);

-- RLS
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Trainer: insert and read own session logs
-- (trainers cannot delete or update historical logs — immutable record)
DROP POLICY IF EXISTS "sl_trainer_insert" ON session_logs;
CREATE POLICY "sl_trainer_insert"
  ON session_logs FOR INSERT
  WITH CHECK (
    trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
    AND gym_id = current_gym_id()
  );

DROP POLICY IF EXISTS "sl_trainer_self_read" ON session_logs;
CREATE POLICY "sl_trainer_self_read"
  ON session_logs FOR SELECT
  USING (
    trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
    AND gym_id = current_gym_id()
  );

-- Owner: read all session logs in their gym
DROP POLICY IF EXISTS "sl_owner_read" ON session_logs;
CREATE POLICY "sl_owner_read"
  ON session_logs FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'owner'
  );

-- Service role bypass
DROP POLICY IF EXISTS "sl_service" ON session_logs;
CREATE POLICY "sl_service"
  ON session_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- SECTION 4: member_memberships — trainer collection tag
-- ==============================================================================
-- NOTE: There is no separate `payments` table in this schema.
-- The `member_memberships` table IS the payment ledger — every row holds
-- payment_status, payment_method, and amount_paid.
--
-- Adds recorded_by_trainer_id to tag memberships whose payment was collected
-- by a trainer on the floor (cash/UPI). NULL = recorded by owner (default).
-- The owner sees a "Recorded by [Trainer Name]" label in the Payment Drawer.
-- ==============================================================================

ALTER TABLE member_memberships
  ADD COLUMN IF NOT EXISTS recorded_by_trainer_id UUID
    REFERENCES trainers(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mm_recorded_by_trainer
  ON member_memberships(recorded_by_trainer_id)
  WHERE recorded_by_trainer_id IS NOT NULL;

-- Trainer INSERT policy on member_memberships:
-- Scoped to their assigned members only. Trainer must self-tag the row.
-- The existing "mm_owner_write" policy already handles owner reads/writes.
-- The existing "mm_gym_isolation" policy already handles owner/trainer SELECT.

DROP POLICY IF EXISTS "mm_trainer_insert" ON member_memberships;
CREATE POLICY "mm_trainer_insert"
  ON member_memberships FOR INSERT
  WITH CHECK (
    gym_id = current_gym_id()
    AND get_my_role() = 'trainer'
    -- Trainer can only record payment for a member assigned to them
    AND member_id IN (
      SELECT ta.member_id
      FROM trainer_assignments ta
      JOIN trainers t ON t.id = ta.trainer_id
      WHERE t.trainer_auth_user_id = auth.uid()
        AND ta.is_current = true
        AND ta.gym_id = current_gym_id()
    )
    -- The recorded_by_trainer_id must match the authenticated trainer (no forgery)
    AND recorded_by_trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
  );


-- ==============================================================================
-- SECTION 5: Verification Queries
-- Run each SELECT after the migration to confirm all objects exist correctly.
-- ==============================================================================

-- 1. Confirm new columns on trainers and member_memberships
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('trainers', 'member_memberships')
  AND column_name IN ('trainer_auth_user_id', 'recorded_by_trainer_id')
ORDER BY table_name, column_name;

-- 2. Confirm new tables exist with correct columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('trainer_attendance', 'session_logs')
ORDER BY table_name, ordinal_position;

-- 3. Confirm RLS is enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('trainer_attendance', 'session_logs')
ORDER BY tablename;

-- 4. Confirm all policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('trainer_attendance', 'session_logs', 'trainers', 'member_memberships')
ORDER BY tablename, policyname;

-- 5. Confirm indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_trainers_auth_user',
    'idx_trainer_attendance_one_open',
    'idx_trainer_attendance_trainer_date',
    'idx_trainer_attendance_gym_date',
    'idx_session_logs_trainer_date',
    'idx_session_logs_member',
    'idx_session_logs_gym_date',
    'idx_mm_recorded_by_trainer'
  )
ORDER BY tablename, indexname;


-- ==============================================================================
-- ROLLBACK PLAN
-- Run only if the migration needs to be fully undone.
-- ==============================================================================
/*
-- Remove policies on existing tables (new tables are dropped via CASCADE below)
DROP POLICY IF EXISTS "trainers_self_update"  ON trainers;
DROP POLICY IF EXISTS "mm_trainer_insert"      ON member_memberships;

-- Remove new columns from existing tables
ALTER TABLE trainers            DROP COLUMN IF EXISTS trainer_auth_user_id;
ALTER TABLE member_memberships  DROP COLUMN IF EXISTS recorded_by_trainer_id;

-- Drop new tables (cascade removes all policies, indexes, and rows)
DROP TABLE IF EXISTS session_logs       CASCADE;
DROP TABLE IF EXISTS trainer_attendance CASCADE;
*/
