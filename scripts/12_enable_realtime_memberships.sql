-- Enable Supabase Realtime for the member_memberships table
-- This is required for the owner dashboard to instantly show new renewal requests
-- and for the member portal to instantly reflect approval/declines.

BEGIN;

-- Add member_memberships to the default Supabase realtime publication
-- Note: If the table is already in the publication, this command will throw a warning, which is fine.
ALTER PUBLICATION supabase_realtime ADD TABLE member_memberships;

COMMIT;
