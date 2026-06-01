-- ==============================================================================
-- 10_chore_002b_auto_status_transition.sql — Bodyline SaaS Platform
-- Auto Status Transition Job (CHORE-002b)
--
-- Registers a nightly pg_cron job that sweeps all tenant memberships and
-- transitions any expired plan from 'paid' or 'pending' → 'overdue'.
--
-- WHY pg_cron?
--   - Runs entirely inside Postgres — no cold starts, no network hops.
--   - Single atomic UPDATE covers all tenants at once (service-level op).
--   - Zero infrastructure cost; survives Vercel deployments untouched.
--
-- PRE-REQUISITE:
--   pg_cron must be enabled on the Supabase project.
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste entire file → Run
--
-- SAFE TO RE-RUN:
--   Uses CREATE OR REPLACE + cron.unschedule (idempotent).
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: Stored Function
-- ==============================================================================

/**
 * expire_overdue_memberships()
 *
 * Sweeps ALL gyms in one atomic UPDATE and marks any membership whose
 * end_date has passed as 'overdue', provided it was still 'paid' or 'pending'
 * and is not currently paused.
 *
 * SECURITY DEFINER: runs with the privileges of the function owner (postgres),
 * bypassing RLS — correct for a background maintenance function.
 *
 * Returns: the number of rows updated (useful for logging / API response).
 */
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
    AND  paused_at IS NULL;   -- exclude currently-paused memberships

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


-- ==============================================================================
-- SECTION 2: pg_cron Scheduled Job
-- ==============================================================================

-- Remove any pre-existing job with this name so the script is safe to re-run.
SELECT cron.unschedule('expire-overdue-memberships')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-memberships'
  );

-- Schedule the job to run every day at 19:00 UTC = 00:30 IST (midnight IST + 30 min buffer).
-- The 30-minute buffer past IST midnight ensures the date boundary has fully rolled
-- over for all users before we sweep, mirroring the IST-safe date practices in lib/utils/date.ts.
SELECT cron.schedule(
  'expire-overdue-memberships',         -- job name (unique key)
  '0 19 * * *',                         -- cron: 19:00 UTC daily = 00:30 IST
  'SELECT expire_overdue_memberships();' -- SQL to execute
);


-- ==============================================================================
-- SECTION 3: Verification
-- ==============================================================================

-- 1. Confirm the function was created
SELECT proname, prosecdef AS security_definer
FROM   pg_proc
WHERE  proname = 'expire_overdue_memberships';

-- 2. Confirm the cron job is registered
SELECT jobid, jobname, schedule, command, active
FROM   cron.job
WHERE  jobname = 'expire-overdue-memberships';

-- 3. Optional: manually invoke to test (safe — only updates genuinely expired rows)
-- SELECT expire_overdue_memberships();
