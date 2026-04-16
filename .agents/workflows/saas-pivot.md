---
description:  Workflow: SaaS Multi-Tenant Pivot # For: Antigravity Agent # Trigger: Manual / `run workflow saas-pivot`
---

# Workflow: SaaS Multi-Tenant Pivot
# For: Antigravity Agent
# Trigger: Manual / `run workflow saas-pivot`
# Estimated Steps: 47
# Risk Level: HIGH — involves schema migration and RLS changes

---

## PRE-FLIGHT CHECKS

Before starting any phase, the agent must verify:

```
□ Supabase project is accessible (test a simple select)
□ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
□ Current git branch is NOT main/master — create branch: feat/saas-multitenancy
□ A full database backup has been triggered in Supabase dashboard
□ No pending migrations exist in supabase/migrations/
```

**STOP and report if any check fails.**

---

## PHASE 1: AUDIT
*Goal: Build a complete picture of what needs to change before touching anything.*

### Step 1.1 — Scan for Hard-Coded Client References

Search the entire codebase for the following strings and generate a report:

```
Search targets (case-insensitive):
- "Pradeep"
- "pradeep"
- "Anand"
- "anand"
- "Gurugram"
- "gurugram"
- "bodyline@upi"
- "Sector 14"
- "DLF Phase"
- "Sohna Road"
- "bodyline.in" (in non-config files)
- "Anand's Bodyline"
- "3 Gurugram branches"
```

**Output format:**
```
FILE: app/onboarding/page.tsx
  LINE 412: "Gurugram's performance gym"
  LINE 445: "Access all 3 Gurugram branches"
  LINE 447: "Sector 14", "DLF Phase 1", "Sohna Road"

FILE: app/dashboard/page.tsx
  LINE 198: "Pradeep · Owner"
  LINE 203: greeting hardcoded to "Pradeep."
```

### Step 1.2 — Audit Database Tables for gym_id

For each table below, record whether `gym_id` column exists:

```
Tables to check:
- members
- membership_plans
- member_memberships
- attendance
- trainers
- trainer_assignments
- bookings
```

Also check if these tables exist (they won't yet):
- `gyms`
- `gym_settings`

### Step 1.3 — Audit Auth Flow

Verify:
- `lib/supabase/client.ts` — uses `createBrowserClient` from `@supabase/ssr`
- `lib/supabase/server.ts` — uses `createServerClient` from `@supabase/ssr`
- `middleware.ts` — uses `createServerClient`, reads/writes cookies

If any file imports from `@supabase/auth-helpers-nextjs`, flag it as CRITICAL.

### Step 1.4 — Audit Components for Extraction Candidates

Scan all page files for repeated patterns. Flag components that appear in 2+ files:

```
Patterns to find:
- Nav bar (`.nav`, `.nav-logo`, `.nav-links`)
- Stat cards (`.stat-card`, `.stat-value`, `.stat-label`)
- Panel containers (`.panel`, `.panel-header`, `.panel-title`)
- Status pills (`.status-pill`, payment badge patterns)
- Avatar initials (getInitials function + avatar div)
- Loading screen (`.loading-screen` + spinner)
- Error screen (`.error-screen`)
```

### Step 1.5 — Generate Audit Report

Create file: `.agent/reports/audit-[timestamp].md`

Include all findings from 1.1–1.4 with a summary section at the top:
```
TOTAL HARD-CODED REFERENCES: N
TABLES WITHOUT gym_id: N
COMPONENTS TO EXTRACT: N
AUTH ISSUES: N (should be 0)
```

**PAUSE HERE. Do not proceed to Phase 2 without human review of the audit report.**

---

## PHASE 2: DATABASE MIGRATION
*Goal: Add gym_id to all tables, create tenant tables, apply RLS policies.*

**Warning:** Run SQL in this exact order. Each step depends on the previous.

### Step 2.1 — Create Core Tenant Tables

Execute `sql/01_create_tenant_tables.sql` (the Handoff SQL from this repo).

Verify tables exist after execution:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('gyms', 'gym_settings');
```

### Step 2.2 — Create the Seed Gym (Pradeep's Bodyline)

```sql
-- Insert the founding gym so existing data has a gym_id to reference
INSERT INTO gyms (id, name, slug, owner_email, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',  -- deterministic UUID for rollback safety
  'Bodyline Fitness',
  'bodyline',
  'pradeep@bodyline.in',
  true
);

INSERT INTO gym_settings (gym_id, upi_id, branches, whatsapp_number, primary_color)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'bodyline@upi',
  '["Sector 14", "DLF Phase 1", "Sohna Road"]'::jsonb,
  NULL,
  '#4ade80'
);
```

### Step 2.3 — Add gym_id to Existing Tables (Non-Breaking)

For each table, add the column as NULLABLE first, then backfill, then constrain:

```sql
-- Pattern: repeat for each table
ALTER TABLE members ADD COLUMN IF NOT EXISTS 
  gym_id UUID REFERENCES gyms(id);

UPDATE members SET gym_id = 'a1b2c3d4-0000-0000-0000-000000000001' 
  WHERE gym_id IS NULL;

ALTER TABLE members ALTER COLUMN gym_id SET NOT NULL;
```

Tables to migrate in this order:
1. `members`
2. `trainers`
3. `membership_plans`
4. `member_memberships`
5. `attendance`
6. `trainer_assignments`
7. `bookings`

### Step 2.4 — Create RLS Helper Function

```sql
CREATE OR REPLACE FUNCTION current_gym_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.gym_id', true), '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Step 2.5 — Apply RLS Policies

For each table, enable RLS and create policies. Pattern:

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_isolation" ON members
  FOR ALL USING (gym_id = current_gym_id());

CREATE POLICY "service_role_bypass" ON members
  FOR ALL TO service_role USING (true);
```

Apply to all 7 tables.

### Step 2.6 — Verify Migration

Run these verification queries and confirm:
```sql
-- All tables have gym_id
SELECT table_name, column_name FROM information_schema.columns 
WHERE column_name = 'gym_id' 
AND table_schema = 'public';

-- RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN 
  ('members','trainers','membership_plans','member_memberships',
   'attendance','trainer_assignments','bookings');

-- No orphaned rows
SELECT COUNT(*) FROM members WHERE gym_id IS NULL;
```

**PAUSE HERE. Do not proceed to Phase 3 without confirming all verification queries pass.**

---

## PHASE 3: CODE REFACTOR
*Goal: Remove hard-coded references, extract reusable components, wire up gym_settings.*

### Step 3.1 — Extract Reusable UI Components

Create each file below. Each component must:
- Use the existing CSS variable design system
- Accept props, not hard-coded values
- Include TypeScript types
- Not import any external CSS

**Files to create:**

```
components/ui/Nav.tsx
components/ui/StatCard.tsx
components/ui/Panel.tsx
components/ui/StatusPill.tsx
components/ui/Avatar.tsx
components/ui/LoadingScreen.tsx
components/ui/EmptyState.tsx
```

For each component, find its pattern in the existing page files and extract it exactly. **Do not redesign. Extraction only.**

### Step 3.2 — Create gym_settings Hook

Create `hooks/useGymSettings.ts`:

```typescript
// Uses TanStack Query to fetch gym settings by gym_id
// Falls back to sensible defaults if settings are not found
// Exposes: gymName, branches, upiId, primaryColor, logoUrl
```

### Step 3.3 — Replace Hard-Coded References

Using the audit report from Phase 1:

**In `app/onboarding/page.tsx`:**
- Replace branch array `["Sector 14", "DLF Phase 1", "Sohna Road"]` with `gymSettings.branches`
- Replace "Gurugram's performance gym" with `gymSettings.tagline ?? "Your local gym"`
- Replace "bodyline@upi" with `gymSettings.upiId`
- Replace "Gurugram" references with `gymSettings.city ?? ""`

**In `app/dashboard/page.tsx`:**
- Replace `"Pradeep · Owner"` in nav with user's name from auth session
- Replace `greeting ... Pradeep.` with the auth user's first name

**In `app/login/page.tsx`:**
- Replace `"20+ Members"` stat with a live count query
- Replace `"3 Locations"` with `gymSettings.branches.length`

### Step 3.4 — Update Middleware for Subdomain Tenant Resolution

Enhance `middleware.ts` to:

1. Read the hostname from the request
2. Extract the subdomain slug (e.g., `bodyline` from `bodyline.bodyline.in`)
3. Resolve `gym_id` from the `gyms` table using the slug
4. Inject `gym_id` into the request via `x-gym-id` header

```typescript
// Pseudocode for the middleware addition
const hostname = request.headers.get('host') ?? ''
const subdomain = hostname.split('.')[0]

if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
  // Fetch gym_id from gyms table by slug
  // Add to request headers for downstream use
  // If not found, redirect to marketing page
}
```

**Note:** For localhost development, read `?gym_slug=` query param as fallback.

### Step 3.5 — Update types/index.ts

Add the following new types:

```typescript
export interface Gym {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  is_active: boolean;
  created_at: string;
}

export interface GymSettings {
  id: string;
  gym_id: string;
  upi_id: string | null;
  branches: string[];
  whatsapp_number: string | null;
  primary_color: string;
  logo_url: string | null;
  tagline: string | null;
  city: string | null;
}
```

Also update all existing table types to include `gym_id: string`.

### Step 3.6 — Final Audit Pass

Re-run all Phase 1 search terms. Confirm zero results remain for hard-coded client names and gym-specific data.

---

## PHASE 4: VERIFICATION

### Step 4.1 — Local Dev Smoke Test

```bash
# Start dev server
npm run dev

# Test these URLs:
# http://localhost:3000/login
# http://localhost:3000/onboarding  
# http://localhost:3000/dashboard
# http://localhost:3000/member?guest=<a-valid-member-id>
# http://localhost:3000/trainer
```

### Step 4.2 — TypeScript Compilation Check

```bash
npx tsc --noEmit
```

Zero errors required.

### Step 4.3 — Commit

```bash
git add -A
git commit -m "migration(tenant): complete SaaS multi-tenant pivot phase 1-3"
git push origin feat/saas-multitenancy
```

---

## ROLLBACK PLAN

If Phase 2 causes issues:

```sql
-- Remove gym_id from all tables (last resort)
ALTER TABLE members DROP COLUMN IF EXISTS gym_id;
ALTER TABLE trainers DROP COLUMN IF EXISTS gym_id;
ALTER TABLE membership_plans DROP COLUMN IF EXISTS gym_id;
ALTER TABLE member_memberships DROP COLUMN IF EXISTS gym_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS gym_id;
ALTER TABLE trainer_assignments DROP COLUMN IF EXISTS gym_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS gym_id;

-- Disable RLS
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
-- (repeat for all tables)

-- Drop new tables
DROP TABLE IF EXISTS gym_settings;
DROP TABLE IF EXISTS gyms;
```