-- ==============================================================================
-- 00_fresh_schema.sql — Bodyline SaaS Platform
-- Full schema creation for a FRESH Supabase project (Dev / UAT environment)
-- ==============================================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN: All statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: RLS Helper Functions
-- ==============================================================================

-- Resolves the current gym from the authenticated user's JWT app_metadata.
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

-- Reads the authenticated user's role (owner / trainer / member).
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


-- ==============================================================================
-- SECTION 2: Core Tenant Tables
-- ==============================================================================

-- Tenant registry — one row per gym
CREATE TABLE IF NOT EXISTS gyms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  owner_email   TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-gym configuration (branding, contact, payments)
CREATE TABLE IF NOT EXISTS gym_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE UNIQUE,
  gym_display_name  TEXT,
  tagline           TEXT,
  logo_url          TEXT,
  primary_color     TEXT NOT NULL DEFAULT '#4ade80',
  city              TEXT,
  branches          JSONB NOT NULL DEFAULT '[]'::jsonb,
  upi_id            TEXT,
  whatsapp_number   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ==============================================================================
-- SECTION 3: Membership Plans
-- ==============================================================================

CREATE TABLE IF NOT EXISTS membership_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  duration_days   INTEGER NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  max_freeze_days INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_gym ON membership_plans(gym_id);


-- ==============================================================================
-- SECTION 4: Members
-- ==============================================================================

CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  date_of_birth DATE,
  joined_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  profile_photo_url TEXT,
  id_proof_url      TEXT,
  branch            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_gym ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(gym_id, phone);


-- ==============================================================================
-- SECTION 5: Trainers (must come before member_memberships)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS trainers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  specialization        TEXT,
  branch                TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  trainer_auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainers_gym ON trainers(gym_id);
CREATE INDEX IF NOT EXISTS idx_trainers_auth_user ON trainers(trainer_auth_user_id)
  WHERE trainer_auth_user_id IS NOT NULL;


-- ==============================================================================
-- SECTION 6: Member Memberships (Payment Ledger)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS member_memberships (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                  UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id               UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id                 UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  amount_paid             NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('paid', 'pending', 'overdue', 'superseded')),
  payment_method          TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'online')),
  recorded_by_trainer_id  UUID REFERENCES trainers(id) ON DELETE SET NULL,
  paused_at               TIMESTAMPTZ DEFAULT NULL,
  paused_until            DATE DEFAULT NULL,
  -- Tracks WHEN money was last collected (set/updated by useRecordPayment).
  -- Distinct from created_at (membership start date) so "This month" tallies
  -- and the Revenue Graph bucket by collection date, not membership creation date.
  last_payment_at         TIMESTAMPTZ DEFAULT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mm_gym ON member_memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_mm_member ON member_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_mm_status ON member_memberships(gym_id, payment_status);


-- ==============================================================================
-- SECTION 7: Trainer Assignments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS trainer_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id     UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  assigned_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_current     BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ta_gym ON trainer_assignments(gym_id);
CREATE INDEX IF NOT EXISTS idx_ta_trainer ON trainer_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_ta_member ON trainer_assignments(member_id);


-- ==============================================================================
-- SECTION 8: Attendance (Member Check-ins)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  check_in   TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out  TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_gym_date ON attendance(gym_id, check_in DESC);
CREATE INDEX IF NOT EXISTS idx_att_member ON attendance(member_id, check_in DESC);


-- ==============================================================================
-- SECTION 9: Trainer Attendance (Staff Clock-in/out)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS trainer_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  date        DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_attendance_one_open
  ON trainer_attendance(trainer_id, date)
  WHERE clock_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_trainer_attendance_trainer_date
  ON trainer_attendance(trainer_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_trainer_attendance_gym_date
  ON trainer_attendance(gym_id, date DESC);


-- ==============================================================================
-- SECTION 10: Session Logs (Trainer → Member PT sessions)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS session_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id    UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
  session_type  TEXT NOT NULL DEFAULT 'personal_training'
                  CHECK (session_type IN (
                    'personal_training',
                    'group',
                    'rehab',
                    'open_gym'
                  )),
  duration_mins INTEGER CHECK (duration_mins > 0 AND duration_mins <= 480),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_logs_trainer_date
  ON session_logs(trainer_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_member
  ON session_logs(member_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_gym_date
  ON session_logs(gym_id, session_date DESC);


-- ==============================================================================
-- SECTION 10.5: Bookings (Member-Requested PT Sessions)
-- Members request a future Personal Training slot with their assigned trainer.
-- Trainer confirms or cancels. Distinct from session_logs (which are completed,
-- trainer-logged sessions). Scoped per gym via gym_id.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id    UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  session_time  TIME NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_member_date
  ON bookings(member_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_trainer_date
  ON bookings(trainer_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_gym_date
  ON bookings(gym_id, session_date DESC);


-- ── bookings RLS ──────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_member_self_rw"  ON bookings;
DROP POLICY IF EXISTS "bookings_trainer_read"    ON bookings;
DROP POLICY IF EXISTS "bookings_trainer_update"  ON bookings;
DROP POLICY IF EXISTS "bookings_owner_all"       ON bookings;
DROP POLICY IF EXISTS "bookings_service"         ON bookings;

-- Members can insert and read their own bookings within the gym
CREATE POLICY "bookings_member_self_rw"
  ON bookings FOR ALL
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT id FROM members
      WHERE email = auth.jwt()->>'email'
        AND gym_id = current_gym_id()
      LIMIT 1
    )
  )
  WITH CHECK (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT id FROM members
      WHERE email = auth.jwt()->>'email'
        AND gym_id = current_gym_id()
      LIMIT 1
    )
  );

-- Trainers can read bookings assigned to them
CREATE POLICY "bookings_trainer_read"
  ON bookings FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'trainer'
    AND trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Trainers can update status (confirm / cancel) on their own assigned bookings
CREATE POLICY "bookings_trainer_update"
  ON bookings FOR UPDATE
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'trainer'
    AND trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    gym_id = current_gym_id()
    AND trainer_id = (
      SELECT id FROM trainers
      WHERE trainer_auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Owners have full access within their gym
CREATE POLICY "bookings_owner_all"
  ON bookings FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

-- Service role bypass
CREATE POLICY "bookings_service"
  ON bookings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ==============================================================================
-- SECTION 11: Seed Demo Gyms
-- ==============================================================================

-- Gym 1: Bodyline Fitness (primary demo)
INSERT INTO gyms (id, name, slug, owner_email, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bodyline Fitness',
  'bodyline',
  'owner@bodyline.in',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_settings (gym_id, gym_display_name, tagline, primary_color, city, branches, upi_id, whatsapp_number)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bodyline Fitness',
  'Where champions are built',
  '#4ade80',
  'Gurugram',
  '["Sector 14", "DLF Phase 1", "Sohna Road"]'::jsonb,
  'bodyline@upi',
  NULL
)
ON CONFLICT (gym_id) DO NOTHING;

-- Gym 2: Iron Temple (second tenant demo)
INSERT INTO gyms (id, name, slug, owner_email, is_active)
VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  'Iron Temple',
  'iron-temple',
  'owner@irontemple.in',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_settings (gym_id, gym_display_name, tagline, primary_color, city, branches, upi_id, whatsapp_number)
VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  'Iron Temple',
  'Forge your strength',
  '#60a5fa',
  'Mumbai',
  '["Andheri", "Bandra"]'::jsonb,
  'irontemple@upi',
  NULL
)
ON CONFLICT (gym_id) DO NOTHING;


-- ==============================================================================
-- SECTION 12: Row Level Security
-- ==============================================================================

-- ── gyms ──────────────────────────────────────────────────────────────────────
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gyms_own_gym"        ON gyms;
DROP POLICY IF EXISTS "gyms_service_bypass" ON gyms;
DROP POLICY IF EXISTS "gyms_anon_read"      ON gyms;

CREATE POLICY "gyms_own_gym"
  ON gyms FOR SELECT
  USING (id = current_gym_id());

CREATE POLICY "gyms_anon_read"
  ON gyms FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "gyms_service_bypass"
  ON gyms FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── gym_settings ──────────────────────────────────────────────────────────────
ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_settings_anon_read"    ON gym_settings;
DROP POLICY IF EXISTS "gym_settings_auth_read"    ON gym_settings;
DROP POLICY IF EXISTS "gym_settings_owner_update" ON gym_settings;
DROP POLICY IF EXISTS "gym_settings_service"      ON gym_settings;

CREATE POLICY "gym_settings_anon_read"
  ON gym_settings FOR SELECT
  TO anon
  USING (true);

-- Authenticated users (owners/trainers) read their own gym settings
CREATE POLICY "gym_settings_auth_read"
  ON gym_settings FOR SELECT
  TO authenticated
  USING (gym_id = current_gym_id());

CREATE POLICY "gym_settings_owner_update"
  ON gym_settings FOR UPDATE
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "gym_settings_service"
  ON gym_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── membership_plans ──────────────────────────────────────────────────────────
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_gym_isolation" ON membership_plans;
DROP POLICY IF EXISTS "plans_anon_read"     ON membership_plans;
DROP POLICY IF EXISTS "plans_owner_write"   ON membership_plans;
DROP POLICY IF EXISTS "plans_service"       ON membership_plans;

CREATE POLICY "plans_gym_isolation"
  ON membership_plans FOR SELECT
  USING (gym_id = current_gym_id());

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
  USING (true) WITH CHECK (true);


-- ── members ───────────────────────────────────────────────────────────────────
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_gym_isolation" ON members;
DROP POLICY IF EXISTS "members_self_read"     ON members;
DROP POLICY IF EXISTS "members_owner_write"   ON members;
DROP POLICY IF EXISTS "members_anon_insert"   ON members;
DROP POLICY IF EXISTS "members_service"       ON members;

CREATE POLICY "members_gym_isolation"
  ON members FOR SELECT
  USING (gym_id = current_gym_id() AND get_my_role() IN ('owner', 'trainer'));

CREATE POLICY "members_self_read"
  ON members FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND email = auth.jwt()->>'email'
  );

CREATE POLICY "members_owner_write"
  ON members FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id() AND get_my_role() = 'owner');

CREATE POLICY "members_anon_insert"
  ON members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "members_service"
  ON members FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── trainers ──────────────────────────────────────────────────────────────────
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainers_gym_isolation" ON trainers;
DROP POLICY IF EXISTS "trainers_anon_read"     ON trainers;
DROP POLICY IF EXISTS "trainers_owner_write"   ON trainers;
DROP POLICY IF EXISTS "trainers_self_update"   ON trainers;
DROP POLICY IF EXISTS "trainers_service"       ON trainers;

CREATE POLICY "trainers_gym_isolation"
  ON trainers FOR SELECT
  USING (gym_id = current_gym_id());

CREATE POLICY "trainers_anon_read"
  ON trainers FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "trainers_owner_write"
  ON trainers FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "trainers_self_update"
  ON trainers FOR UPDATE
  USING (trainer_auth_user_id = auth.uid() AND gym_id = current_gym_id())
  WITH CHECK (trainer_auth_user_id = auth.uid() AND gym_id = current_gym_id());

CREATE POLICY "trainers_service"
  ON trainers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── member_memberships ────────────────────────────────────────────────────────
ALTER TABLE member_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mm_gym_isolation"  ON member_memberships;
DROP POLICY IF EXISTS "mm_self_read"      ON member_memberships;
DROP POLICY IF EXISTS "mm_owner_write"    ON member_memberships;
DROP POLICY IF EXISTS "mm_trainer_insert" ON member_memberships;
DROP POLICY IF EXISTS "mm_anon_insert"    ON member_memberships;
DROP POLICY IF EXISTS "mm_service"        ON member_memberships;

CREATE POLICY "mm_gym_isolation"
  ON member_memberships FOR SELECT
  USING (gym_id = current_gym_id() AND get_my_role() IN ('owner', 'trainer'));

CREATE POLICY "mm_self_read"
  ON member_memberships FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT id FROM members
      WHERE email = auth.jwt()->>'email'
        AND gym_id = current_gym_id()
      LIMIT 1
    )
  );

CREATE POLICY "mm_owner_write"
  ON member_memberships FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "mm_trainer_insert"
  ON member_memberships FOR INSERT
  WITH CHECK (
    gym_id = current_gym_id()
    AND get_my_role() = 'trainer'
    AND member_id IN (
      SELECT ta.member_id FROM trainer_assignments ta
      JOIN trainers t ON t.id = ta.trainer_id
      WHERE t.trainer_auth_user_id = auth.uid()
        AND ta.is_current = true AND ta.gym_id = current_gym_id()
    )
    AND recorded_by_trainer_id = (
      SELECT id FROM trainers WHERE trainer_auth_user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "mm_anon_insert"
  ON member_memberships FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "mm_service"
  ON member_memberships FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── attendance ────────────────────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_gym_isolation" ON attendance;
DROP POLICY IF EXISTS "att_self_read"     ON attendance;
DROP POLICY IF EXISTS "att_service"       ON attendance;

CREATE POLICY "att_gym_isolation"
  ON attendance FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() IN ('owner', 'trainer'))
  WITH CHECK (gym_id = current_gym_id() AND get_my_role() IN ('owner', 'trainer'));

CREATE POLICY "att_self_read"
  ON attendance FOR SELECT
  USING (
    gym_id = current_gym_id()
    AND get_my_role() = 'member'
    AND member_id = (
      SELECT id FROM members
      WHERE email = auth.jwt()->>'email'
        AND gym_id = current_gym_id()
      LIMIT 1
    )
  );

CREATE POLICY "att_service"
  ON attendance FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── trainer_assignments ───────────────────────────────────────────────────────
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ta_gym_isolation_read"  ON trainer_assignments;
DROP POLICY IF EXISTS "ta_gym_isolation_write" ON trainer_assignments;
DROP POLICY IF EXISTS "ta_service"             ON trainer_assignments;

CREATE POLICY "ta_gym_isolation_read"
  ON trainer_assignments FOR SELECT
  USING (gym_id = current_gym_id());

CREATE POLICY "ta_gym_isolation_write"
  ON trainer_assignments FOR ALL
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner')
  WITH CHECK (gym_id = current_gym_id());

CREATE POLICY "ta_service"
  ON trainer_assignments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── trainer_attendance ────────────────────────────────────────────────────────
ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ta_att_self_rw"    ON trainer_attendance;
DROP POLICY IF EXISTS "ta_att_owner_read" ON trainer_attendance;
DROP POLICY IF EXISTS "ta_att_service"    ON trainer_attendance;

CREATE POLICY "ta_att_self_rw"
  ON trainer_attendance FOR ALL
  USING (
    trainer_id = (SELECT id FROM trainers WHERE trainer_auth_user_id = auth.uid() LIMIT 1)
    AND gym_id = current_gym_id()
  )
  WITH CHECK (
    trainer_id = (SELECT id FROM trainers WHERE trainer_auth_user_id = auth.uid() LIMIT 1)
    AND gym_id = current_gym_id()
  );

CREATE POLICY "ta_att_owner_read"
  ON trainer_attendance FOR SELECT
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner');

CREATE POLICY "ta_att_service"
  ON trainer_attendance FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ── session_logs ──────────────────────────────────────────────────────────────
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_trainer_insert"   ON session_logs;
DROP POLICY IF EXISTS "sl_trainer_self_read" ON session_logs;
DROP POLICY IF EXISTS "sl_owner_read"       ON session_logs;
DROP POLICY IF EXISTS "sl_service"          ON session_logs;

CREATE POLICY "sl_trainer_insert"
  ON session_logs FOR INSERT
  WITH CHECK (
    trainer_id = (SELECT id FROM trainers WHERE trainer_auth_user_id = auth.uid() LIMIT 1)
    AND gym_id = current_gym_id()
  );

CREATE POLICY "sl_trainer_self_read"
  ON session_logs FOR SELECT
  USING (
    trainer_id = (SELECT id FROM trainers WHERE trainer_auth_user_id = auth.uid() LIMIT 1)
    AND gym_id = current_gym_id()
  );

CREATE POLICY "sl_owner_read"
  ON session_logs FOR SELECT
  USING (gym_id = current_gym_id() AND get_my_role() = 'owner');

CREATE POLICY "sl_service"
  ON session_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ==============================================================================
-- SECTION 13: Scheduled Jobs (CHORE-002b — Auto Status Transition)
-- ==============================================================================
--
-- PRE-REQUISITE: pg_cron extension must be enabled.
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- expire_overdue_memberships()
--   Sweeps ALL gyms in one atomic UPDATE: any membership whose end_date has
--   passed and is still 'paid' or 'pending' (and not paused) → 'overdue'.
--   SECURITY DEFINER runs as postgres, bypassing RLS — correct for a
--   background maintenance function that intentionally touches all tenants.

CREATE OR REPLACE FUNCTION expire_overdue_memberships()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE member_memberships
  SET    payment_status = 'overdue'
  WHERE  end_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
    AND  payment_status IN ('paid', 'pending')
    AND  paused_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Schedule nightly at 19:00 UTC = 00:30 IST (30-minute buffer past IST midnight).
-- Remove any pre-existing registration first so this block is safe to re-run.
SELECT cron.unschedule('expire-overdue-memberships')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-memberships'
  );

SELECT cron.schedule(
  'expire-overdue-memberships',
  '0 19 * * *',
  'SELECT expire_overdue_memberships();'
);


-- ==============================================================================
-- SECTION 14: Verification
-- ==============================================================================

-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

-- Check both demo gyms are seeded
SELECT id, name, slug FROM gyms;

-- Check the cron job is registered
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE  jobname = 'expire-overdue-memberships';
