# SaaS Multi-Tenant Migration Tracker

## 🏁 Phase 1: Audit
- [x] 1.1 Scan for hard-coded references (Pradeep, Bodyline, etc.)
- [x] 1.2 Audit tables for `gym_id` (All tables checked)
- [x] 1.3 Audit Auth flow (SSR clients verified)
- [x] 1.4 Audit components for extraction (Nav, StatCard, Panel)
- [x] 1.5 Generate report

## 🏗️ Phase 2: Database Migration
- [x] 2.1 Create core tenant tables (`gyms`, `gym_settings`)
- [x] 2.2 Create seed gym (Bodyline Fitness)
- [x] 2.3 Add `gym_id` to all 7 tables
- [x] 2.4 Create RLS helper function (`current_gym_id()`)
- [x] 2.5 Apply RLS policies
- [x] 2.6 Verify migration (Verified via login + debug-auth)

## 🛠️ Phase 3: Code Refactor
- [x] 3.1 Extract reusable UI components (Completed: `Nav`, `StatCard`, `Panel`, `Avatar`, `StatusPill`. Reverted styling back to original state to prevent UI drift).
- [x] 3.2 Create `hooks/useGymSettings.ts` (Dynamic gym_id fetching hooked up).
- [x] 3.3 Replace hard-coded single-gym references (The SaaS conversion) in:
    - [x] `app/dashboard/page.tsx` (Done - Now Multi-Tenant and strictly adheres to original UI)
    - [x] `app/login/page.tsx` (Removed hardcoded "Bodyline Fitness", linked useGymSettings, consolidated CSS)
    - [x] `app/onboarding/page.tsx`
    - [x] RLS policies `FOR SELECT USING (true)` verified working on `gyms` and `gym_settings`.
- [x] 3.4 Update middleware.ts for subdomain tenant resolution (Essential for SaaS)
- [x] 3.5 Update TypeScript `types/index.ts` (Done - gym_id added across the board)

## 🧪 Phase 4: UI & Functionality Verification
- [x] 4.1 **Golden UI Sweep**: AI Agents MUST verify that all refactored pages strictly match the padding, fonts, cards, and grid logic in `app/dashboard/members/page.tsx`. No rogue CSS.
- [x] 4.2 Local smoke test (Checked Owner, Trainer, and Member portals)
- [x] 4.3 TypeScript compilation check (`tsc --noEmit`) verified.
- [x] 4.4 Final audit pass (Zero hardcoded strings for "Bodyline" across the codebase)

## 🛡️ Phase 5: Security Hardening (COMPLETED)
- [x] 5.1 Hardened RLS policies (No `auth.users` subqueries, tenant-scoped anon access)
- [x] 5.2 Secure Auth Metadata Merging (Added pagination and merging logic)
- [x] 5.3 Role Source-of-Truth fix (Middleware now relies on `app_metadata.role`)
- [x] 5.4 Performance Optimization (Centralized next/font loading, removed render-blocking imports)

## 🚀 Phase 6: Domain & Deployment (Future)
- [ ] 6.1 Configure wildcard subdomains
- [ ] 6.2 Test `[gym-slug].yourdomain.com` routing
