# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
Continue standardizing the entire application to follow the "Golden UI" standard and modular architecture established in the `members` page. Migrate away from monolithic pages filled with inline CSS and redundant fetches, towards TanStack Query hooks, `lib/` utilities, and global CSS UI patterns.

## 🏗️ Architectural Core
- **Framework**: Next.js 14 (App Router) + Supabase SSR.
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS (Row Level Security) is ACTIVE and HARDENED. Helper functions `current_gym_id()` and `get_my_role()` are the source of truth.
- **Styling**: Vanilla CSS scoped within `<style>` tags. Global tokens are in `app/globals.css`.
- **Data Fetching**: TanStack Query (via custom hooks in `hooks/`) for all database operations instead of standard `useEffect`.

## 📍 Modularity Status - Phase "Golden UI"

### ✅ Completed (Branch: `refact/REFACT-003-members-page-modularity`)
1. **Members Page Modularization (Gold Standard)**: 
   - Went from 1360+ lines to ~350 lines.
   - Inline `<nav>` -> extracted to `<Nav />`.
   - Business logic extracts: formatting (`lib/utils/format.ts`), dates (`lib/utils/date.ts`), status logic (`lib/members/status.ts`), filters (`lib/members/filters.ts`).
   - Shared CSS extracted to `globals.css` (tokens, forms, avatars, nav).
   - Data fetching extracted to `hooks/useMembers.ts` (TanStack query).
   - `MemberDrawer` component and its CSS separated out.
2. **Nav Component (`components/ui/Nav.tsx`)**: Now handles its own internal Supabase auth fetch, no longer relies on heavy prop tracking.
3. Everything is fully strictly typed and `npx tsc --noEmit` returns zero errors.

### 🔜 To-Do (Next Branches)
1. **Merge REFACT-003**: The REFACT-003 branch is ready to be merged into `main` via PR.
2. **Dashboard Page Cleanup (`REFACT-004-dashboard-cleanup`)**:
   - High Priority. Extremely monolithic.
   - Strip out redundant local `formatINR`, `formatDate`, `getInitials` logic and use `lib/utils/format.ts`.
   - Refactor `useEffect` fetching logic into TanStack Query hooks (e.g. `useDashboardStats`).
   - Eliminate `<style>` tag, moving specific design pieces to a `dashboard.css` and leveraging `globals.css`.
3. **Payments Page Cleanup (`REFACT-005-payments-cleanup`)**:
   - Highly monolithic. 
   - Needs TanStack hook + deduplication of logic. 
   - Needs to adopt standard loading/error screens from Golden UI.
4. **Trainers & Remaining Pages**:
   - `trainers/page.tsx`, `onboarding/page.tsx`, `app/page.tsx`, `login/page.tsx`.
   - Ensure they match the Golden UI padding, inherit the `loading-screen` component, and remove inline styles.

## 🧪 Local Testing Protocol (Offline/Localhost)
- Use `npm run dev`.
- Test subdomains locally by adding `bodyline.localhost` to your hosts file or using the `?gym=slug` parameter.
- Verify RLS by switching roles in `app_metadata` (Owner vs Trainer).

## 🚩 Pending Production Hardening
- **Error Boundaries**: Ensure each page has a proper `error.tsx` for production stability.
- **Loading Skeletons**: Replace the full-screen "Loading..." text with the CSS-skeleton pattern if applicable.
