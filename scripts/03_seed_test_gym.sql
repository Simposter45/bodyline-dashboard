-- =============================================================================
-- scripts/03_seed_test_gym.sql
-- CHORE-006: Second Test Gym — "Iron Temple"
-- =============================================================================
-- PURPOSE:
--   Seed a second tenant for multi-tenancy isolation testing.
--   Verify that Gym A (Bodyline) and Gym B (Iron Temple) share ZERO data.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN: All statements use ON CONFLICT DO NOTHING.
--
-- AFTER RUNNING:
--   1. Go to Supabase Dashboard → Authentication → Users → Add User
--   2. Email: owner@irontemple.in  Password: (your choice)
--   3. After creating, click the user → Edit → Raw app_metadata:
--      { "role": "owner", "gym_id": "b2c3d4e5-0000-0000-0000-000000000002" }
--   4. Save — this user can now log in and see only Iron Temple data.
-- =============================================================================


-- =============================================================================
-- SECTION 1: Iron Temple Gym Record
-- =============================================================================

INSERT INTO gyms (id, name, slug, owner_email, is_active)
VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',  -- deterministic UUID for easy rollback
  'Iron Temple',
  'irontemple',
  'owner@irontemple.in',
  true
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 2: Iron Temple Gym Settings
-- =============================================================================

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
  'b2c3d4e5-0000-0000-0000-000000000002',
  'Iron Temple',
  'Bangalore''s iron hub',
  '#60a5fa',                                      -- blue accent (distinct from Bodyline green)
  'Bangalore',
  '["Koramangala", "Indiranagar"]'::jsonb,
  'irontemple@upi',
  NULL
)
ON CONFLICT (gym_id) DO NOTHING;


-- =============================================================================
-- SECTION 3: Membership Plans for Iron Temple
-- =============================================================================

INSERT INTO membership_plans (id, gym_id, name, duration_days, price, description, is_active)
VALUES
  (
    'c3d4e5f6-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Monthly Grind',
    30,
    1200,
    'Full access to all Iron Temple branches for 1 month',
    true
  ),
  (
    'c3d4e5f6-0000-0000-0000-000000000002',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Quarter Beast',
    90,
    3200,
    '3 months of unlimited training',
    true
  ),
  (
    'c3d4e5f6-0000-0000-0000-000000000003',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Annual Warrior',
    365,
    10000,
    'Best value — full year access',
    true
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 4: Seed Trainer for Iron Temple
-- =============================================================================

INSERT INTO trainers (id, gym_id, full_name, phone, email, specialization, branch, is_active)
VALUES (
  'd4e5f6a7-0000-0000-0000-000000000001',
  'b2c3d4e5-0000-0000-0000-000000000002',
  'Vikram Nair',
  '9876543210',
  'vikram@irontemple.in',
  'Strength & Powerlifting',
  'Koramangala',
  true
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 5: Seed Members for Iron Temple
-- =============================================================================

INSERT INTO members (id, gym_id, full_name, phone, email, branch, joined_date, is_active)
VALUES
  (
    'e5f6a7b8-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Arjun Reddy',
    '9123456781',
    'arjun@example.com',
    'Koramangala',
    CURRENT_DATE - INTERVAL '45 days',
    true
  ),
  (
    'e5f6a7b8-0000-0000-0000-000000000002',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Sneha Kulkarni',
    '9123456782',
    'sneha@example.com',
    'Indiranagar',
    CURRENT_DATE - INTERVAL '10 days',
    true
  ),
  (
    'e5f6a7b8-0000-0000-0000-000000000003',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'Rohit Menon',
    '9123456783',
    NULL,
    'Koramangala',
    CURRENT_DATE - INTERVAL '90 days',
    true
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 6: Seed Memberships for Iron Temple Members
-- =============================================================================

INSERT INTO member_memberships (id, gym_id, member_id, plan_id, start_date, end_date, amount_paid, payment_status, payment_method)
VALUES
  (
    -- Arjun: active paid membership
    'f6a7b8c9-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'e5f6a7b8-0000-0000-0000-000000000001',
    'c3d4e5f6-0000-0000-0000-000000000001',  -- Monthly Grind
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days',
    1200,
    'paid',
    'upi'
  ),
  (
    -- Sneha: pending membership (new member, pay at counter)
    'f6a7b8c9-0000-0000-0000-000000000002',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'e5f6a7b8-0000-0000-0000-000000000002',
    'c3d4e5f6-0000-0000-0000-000000000002',  -- Quarter Beast
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '80 days',
    0,
    'pending',
    'cash'
  ),
  (
    -- Rohit: overdue membership (expired)
    'f6a7b8c9-0000-0000-0000-000000000003',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'e5f6a7b8-0000-0000-0000-000000000003',
    'c3d4e5f6-0000-0000-0000-000000000001',  -- Monthly Grind
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '60 days',
    0,
    'overdue',
    'cash'
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 7: Seed Attendance for Iron Temple
-- =============================================================================

INSERT INTO attendance (id, gym_id, member_id, check_in, check_out)
VALUES
  (
    'a7b8c9d0-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'e5f6a7b8-0000-0000-0000-000000000001',  -- Arjun checked in today
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'a7b8c9d0-0000-0000-0000-000000000002',
    'b2c3d4e5-0000-0000-0000-000000000002',
    'e5f6a7b8-0000-0000-0000-000000000002',  -- Sneha — yesterday
    NOW() - INTERVAL '1 day 3 hours',
    NOW() - INTERVAL '1 day 2 hours'
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 8: Trainer Assignment
-- =============================================================================

INSERT INTO trainer_assignments (id, gym_id, trainer_id, member_id, assigned_date, is_current)
VALUES (
  'b8c9d0e1-0000-0000-0000-000000000001',
  'b2c3d4e5-0000-0000-0000-000000000002',
  'd4e5f6a7-0000-0000-0000-000000000001',  -- Vikram Nair
  'e5f6a7b8-0000-0000-0000-000000000001',  -- Arjun Reddy
  CURRENT_DATE - INTERVAL '14 days',
  true
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECTION 9: Verification Queries — Run these to confirm seeding was successful
-- =============================================================================

-- 1. Both gyms present
SELECT id, name, slug, owner_email, is_active FROM gyms ORDER BY name;

-- 2. Both gym_settings present
SELECT gym_id, gym_display_name, city, branches, primary_color FROM gym_settings;

-- 3. Iron Temple data row counts
SELECT 'membership_plans' AS tbl, COUNT(*) AS rows FROM membership_plans WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'
UNION ALL
SELECT 'trainers',            COUNT(*) FROM trainers           WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'
UNION ALL
SELECT 'members',             COUNT(*) FROM members            WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'
UNION ALL
SELECT 'member_memberships',  COUNT(*) FROM member_memberships WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'
UNION ALL
SELECT 'attendance',          COUNT(*) FROM attendance         WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002'
UNION ALL
SELECT 'trainer_assignments', COUNT(*) FROM trainer_assignments WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';

-- Expected: plans=3, trainers=1, members=3, memberships=3, attendance=2, assignments=1

-- 4. Confirm NO data cross-contamination (all rows belong to their own gym)
SELECT
  'members' AS tbl,
  COUNT(*) FILTER (WHERE gym_id = 'a1b2c3d4-0000-0000-0000-000000000001') AS bodyline,
  COUNT(*) FILTER (WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002') AS irontemple,
  COUNT(*) FILTER (WHERE gym_id NOT IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b2c3d4e5-0000-0000-0000-000000000002'
  )) AS unknown_gym
FROM members;

-- =============================================================================
-- ROLLBACK (run only to undo this seed)
-- =============================================================================
/*
DELETE FROM trainer_assignments WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM attendance          WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM member_memberships  WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM members             WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM trainers            WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM membership_plans    WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM gym_settings        WHERE gym_id = 'b2c3d4e5-0000-0000-0000-000000000002';
DELETE FROM gyms                WHERE id     = 'b2c3d4e5-0000-0000-0000-000000000002';
*/
