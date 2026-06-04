-- Drop the existing check constraint
ALTER TABLE member_memberships DROP CONSTRAINT IF EXISTS member_memberships_payment_status_check;

-- Add the new constraint including 'superseded'
ALTER TABLE member_memberships ADD CONSTRAINT member_memberships_payment_status_check 
  CHECK (payment_status IN ('paid', 'pending', 'overdue', 'superseded'));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
