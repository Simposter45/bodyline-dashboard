-- ==============================================================================
-- RLS Policy: Public Discovery for Multi-Tenant SaaS
-- ==============================================================================
-- Description: Allows anonymous (unauthenticated) users to resolve tenant details
-- based on subdomains or URL slugs (e.g. /login?gym=slug).
-- Required for branding to load before the user hits "Sign In".

-- 1. Enable Public Read on `gyms`
DROP POLICY IF EXISTS "Public gyms discovery" ON gyms;
-- NOTE: While this allows public discovery, sensitive PII like owner_email 
-- should be protected. In production, consider a SECURITY DEFINER view 
-- that only returns (id, name, slug, is_active).
CREATE POLICY "Public gyms discovery" ON gyms
  FOR SELECT 
  USING (is_active = true);

-- 2. Enable Public Read on `gym_settings`
DROP POLICY IF EXISTS "Public gym settings discovery" ON gym_settings;
CREATE POLICY "Public gym settings discovery" ON gym_settings
  FOR SELECT 
  USING (true);
