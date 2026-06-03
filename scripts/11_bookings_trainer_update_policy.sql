-- ============================================================
-- 11_bookings_trainer_update_policy.sql
-- Adds UPDATE permission for trainers on their own bookings.
-- 
-- Root cause: bookings_trainer_read was SELECT-only. Trainers
-- had no RLS policy to UPDATE booking status (confirm/cancel).
-- This caused PGRST116 on all trainer booking mutations.
-- ============================================================

DROP POLICY IF EXISTS "bookings_trainer_update" ON bookings;

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
