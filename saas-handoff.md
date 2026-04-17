# Context: Bodyline Gym -> SaaS Multi-Tenant Pivot

## What Has Been Completed to Date
We are converting an MVP platform built specifically for "Bodyline Gym" into a scalable, multi-tenant SaaS application natively built on Next.js 16 (App Router) and Supabase.

1. **Database Schema & RLS Migrated**: 
   - All 7 core tables now have a `gym_id` column.
   - We created a `gyms` and `gym_settings` table. 
   - We added Row Level Security (RLS) policies enforcing `gym_id` parity.
   - We executed public `SELECT` policies for anonymous tenant lookup on `gyms` and `gym_settings`.

2. **Component Generalization**: 
   - Removed duplicate inline `<style>` injections from pages. Extracted a global core into `app/globals.css`.
   - Core UI components (`Nav.tsx`, `StatCard.tsx`, `Panel.tsx`, `Avatar.tsx`, `StatusPill.tsx`) have been fully refactored.
   - **The Golden UI Rule**: To prevent AI drift, `AGENTS.md` strictly dictates that all spacing, padding, and UI grids *must* perfectly match the patterns found in `app/dashboard/members/page.tsx`.

3. **Dynamic Tenant Fetching Hook**:
   - `hooks/useGymSettings.ts` successfully fetches a gym dynamically.
   - It reads URL parameters (`?gym=bodyline`) or handles fallback when accessed generally (`localhost`). 
   - If accessed generically (`/login`), it returns an unbranded skeleton platform layout.

4. **Dashboard & Login Pages Safely Converted**:
   - `app/dashboard/page.tsx` and `app/login/page.tsx` are fully SaaS-aware. Hardcoded "Bodyline" data and default dummy emails are gone, replaced completely by the dynamic branding.

5. **Strict Branching Strategy**:
   - `AGENTS.md` enforces a prefix ticketing strategy for branches (e.g., `FEAT-001`, `BUG-002`, `REFACT-xxx`).

---

## What is Left (To Do Next)
You are currently on Phase 3 Phase 4 of the `MIGRATION_PROGRESS.md` tracker.

**Immediate Priorities for This Next Session:**
1. **Refactor the Onboarding Page (`app/onboarding/page.tsx`)**: This is the very last legacy file remaining that hardcodes "Bodyline" text. Apply the exact same `useGymSettings` (React Query) pattern to make it dynamically change UI based on the `?gym=` parameter.
2. **Build the SaaS Subdomain Middleware (`middleware.ts`)**: Implement Hostname resolution routing. Instead of relying purely on `.get("gym")`, the system should intercept requests natively like `gym1.localhost:3000` or `gym1.bodyline.in` and inject the context seamlessly.
3. **Conduct Final QA Audit Pass**: Perform a codebase-wide check searching for the string "Bodyline" (ignoring seed files) to ensure zero hardcoded traces remain.
