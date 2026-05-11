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

## 🧩 Phase 6: Code Modularity & "Golden UI" Enforcement
- [x] 6.1 `members/page.tsx` cleanup (Branch: `refactor/REFACT-003-members-page-modularity` — **merged to main**).
- [x] 6.2-A **Add Member feature** (Branch: `FEAT-002-add-member-logic` — **merged to main**).
    - 3-step wizard modal (Details → Payment Checkout → Success/Handoff)
    - Zod v4 schema (`lib/validations/member.ts`) with strict Indian phone regex
    - TanStack `useMutation` hook (`hooks/useCreateMember.ts`) — inserts `members` + `member_memberships` atomically
    - TanStack `useQuery` hook (`hooks/usePlans.ts`) — fetches active plans
    - Reusable `Modal` component (`components/ui/Modal.tsx`)
    - Global `<Toaster />` wired in `app/layout.tsx`
    - `addDays(n)` added to shared `lib/utils/date.ts`
- [x] 6.2-B **CodeRabbit hotfixes + AGENTS.md coding conventions** (direct commit `ec49126` on `main`).
    - MemberDrawer: fixed expiry color bug (expiring=amber, overdue=red), non-null assertion removed
    - MemberDrawer.css: hidden scrollbar rules added
    - AddMemberModal: `<style jsx>` → `<style>`, `error: any` → `unknown`, `toISOString` → `todayISO()`
    - AGENTS.md: Section 9 added (8 coding conventions)
- [x] 6.3-A **Renew Membership** action (`feat/FEAT-003-renew-and-record-payment`)
- [x] 6.3-B **Record Payment** action (`feat/FEAT-003-renew-and-record-payment`)
- [x] 6.4 `dashboard/page.tsx` cleanup (`refactor/REFACT-004-dashboard-cleanup`) — **branch ready, pending merge**
    - Step 1: Extended `lib/utils/format.ts` + `lib/utils/date.ts` with shared helpers (`formatTime`, `getGreeting`, `monthStartISO`, `todayRangeISO`, `sevenDaysFromNow`)
    - Step 2: `hooks/useCurrentUser.ts` — TanStack Query hook for auth identity
    - Step 3: `hooks/useDashboardStats.ts` — TanStack Query hook, 6 parallel queries, `DashboardStats` return type, `amountDue` logic aligned with payments page
    - Step 4: `app/dashboard/dashboard.css` — co-located styles, global duplicates removed
    - Step 5: `app/dashboard/page.tsx` full rewrite — 330 → 142 lines, zero `useEffect`, zero `any`, zero inline styles
    - Fix: `Avatar` component — font corrected to `var(--font-ui)`, accent dim background tint added
    - Fix: `Avatar` component — `href` prop (clickable photo) + `useState` `onError` fallback added
    - Fix: All avatar usages migrated to `<Avatar />` component (`members/page.tsx`, `MemberDrawer.tsx`)
    - Fix: Overdue revenue calculation — `Math.max(0, plan.price - amount_paid)` (was `Math.abs`, was negative)
    - Fix: Pending revenue calculation — balance due, not full plan price (was overcounting partial payments)
    - Fix: `expiringThisWeek` — real DB query (was hardcoded `0`)
- [x] 6.5 `payments/page.tsx` cleanup (`refactor/REFACT-005-payments-cleanup`)
    - Step 1: `hooks/usePayments.ts` — TanStack Query hook, `queryKey: ["payments"]`, exports `PaymentRecord` type. `useRecordPayment` + `useRenewMembership` now also invalidate `["payments"]`.
    - Step 2: `app/dashboard/payments/payments.css` — co-located styles extracted from 630-line inline `<style>` block, globals duplicates removed.
    - Step 3: `app/dashboard/payments/PaymentDrawer.tsx` + `PaymentDrawer.css` — extracted from page, uses `<Avatar>`, `STATUS_CONFIG`, `formatINR`/`formatDate` from shared libs.
    - Step 4: `app/dashboard/payments/page.tsx` rewrite — 1,419 → 255 lines. `useEffect` removed, `<Nav>` wired, all local helpers eliminated.
    - Fix: `useDashboardStats.ts` — `totalCollected` now sums ALL paid rows (was incorrectly deduplicated to latest-per-member, causing mismatch vs payments page).
    - Fix: Payments page `summary` — `totalPending` + `totalOverdue` now use latest-per-member deduplication, matching dashboard/members counts exactly. `totalCollected` remains ALL rows (cumulative ledger).
- [x] 6.6 `hooks/usePlans.ts` upgrade (REFACT-006 Step 1 — branch `refactor/REFACT-006-remaining-pages`)
    - Added `gymId?: string | null` three-state pattern: `undefined` = RLS (dashboard), `null` = hold query (pre-auth loading), `string` = explicit gym_id filter
    - Existing callers (`AddMemberModal`, `RenewMembershipModal`) pass no arg → unchanged
- [x] 6.7 `app/onboarding/page.tsx` cleanup (REFACT-006 Step 2)
    - 1,471 → 934 lines. Inline `<style>` extracted to co-located `onboarding.css`
    - Local CSS `:root {}` removed; aliases map to design tokens via `onboarding.css`
    - Local `formatINR()`, `addDays()` removed → shared `lib/utils/`
    - `new Date().toISOString()` × 2 → `todayISO()`
    - Raw plans `useEffect` → `usePlans(settings?.gym_id ?? null)` (gym-scoped, pre-auth safe)
    - Hardcoded branches `["Sector 14", ...]` → `settings?.branches ?? []`
    - Step 2 copy "all 3 branches" → dynamic from `settings.branches.length`
    - PowerShell-induced UTF-8 encoding corruption fixed
- [ ] 6.8 `app/login/page.tsx` cleanup (REFACT-006 Step 3 — IN PROGRESS)
    - Extract ~430-line inline `<style>` → `login.css`
    - Replace hardcoded left-panel stats (20+ members, 3 trainers) → `usePublicGymStats` hook
- [x] 6.9 `app/dashboard/trainers/page.tsx` cleanup (`refactor/REFACT-007-trainers-page`) — **branch pushed, pending PR**
    - Step 1: `hooks/useTrainers.ts` — TanStack Query hook, `queryKey: ["trainers"]`, `Promise.all` parallel fetch (trainers + assignments+members join), exports `TrainerWithAssignments` type
    - Step 2: `app/dashboard/trainers/trainers.css` — 450-line inline `<style>` extracted; global classes (nav, page, loading, error, btn-solid) removed; trainer-specific layout/card/panel classes kept
    - Step 3: `app/dashboard/trainers/page.tsx` full rewrite — 861 → ~210 lines, zero `useEffect`, zero `any`, zero inline styles, zero hardcoded strings
        - `<Nav role="owner" />` replaces custom nav + hardcoded `"Pradeep · Owner"`
        - `useTrainers()` replaces raw `useEffect` + `fetchTrainers()`
        - `getInitials`, `formatDate` from `lib/utils/format.ts` (local duplicates removed)
        - `<Phone />`, `<Mail />`, `<Plus />` from `lucide-react` (raw SVGs removed)
        - `.btn-solid` global class replaces local `.add-btn`
        - `trainer.phone` null-guard added in card stats (latent bug fixed — `phone: string | null`)
        - Auto-select first trainer via pure derivation (no `useEffect`)
    - Step 4: `types/index.ts` verified — zero changes needed
    - TypeScript: `npx tsc --noEmit` — 0 errors

## ⚠️ Known Technical Debt
- `useCreateMember.ts`: Two-step DB insert (members → member_memberships) is NOT atomic. If the second insert fails, an orphaned member record is created. **Future: Refactor into a Supabase RPC/PostgreSQL transaction function.** Track as `CHORE-001`.
- **`CHORE-002` — `payment_status` Auto-Transition (pending → overdue)** — **PARTIALLY DONE**
  - **Client-side complete** (branch `chore/CHORE-002-payment-status-auto-transition`):
    - `"superseded"` status added to `PaymentStatus` type, `StatusKey`, `STATUS_CONFIG`
    - `useRenewMembership` supersedes old `pending`/`overdue` rows (gym_id scoped) on renewal
    - `usePayments` excludes superseded rows from all queries (internal bookkeeping only)
    - DB `CHECK` constraint updated to allow `'superseded'`
  - **`CHORE-002b` — Deferred (DB batch job)**: pg_cron daily job to auto-transition `pending → overdue` when `end_date < today`. Non-blocking — client-side deduplication workaround is in place.
  - **Future — `CHORE-003`**: Per-gym timezone support — `monthStartISTTimestamp()` is hardcoded IST; needs `gym_settings.timezone` column and dynamic offset resolution.
- **`BUG-001` — "This month collected" showing ₹0** — **FIXED** in `chore/CHORE-002` branch
  - Root cause: `created_at` (UTC timestamp) was compared against a plain date string (`monthStartISO()`), causing IST payments to be excluded
  - Fix: Added `monthStartISTTimestamp()` to `lib/utils/date.ts` — converts IST month start to its UTC equivalent for correct timestamp comparison

## 🔧 Production Hardening (Pending)
- [ ] Error boundaries: Each route needs a proper `error.tsx`
- [ ] Loading skeletons: Replace text "Loading..." with CSS skeleton pattern
- [ ] **FEAT-006 — Pagination**: Members and Payments tables have no pagination. Add the same 25-row pattern used in the attendance page. Will be needed before any serious user volume.
- [ ] **FEAT-007 — Trainer actions**: "Add trainer", "Assign member", "Edit trainer" buttons are wired but modals are TBD (deferred from REFACT-007 scope).

## 🚀 Phase 7: Domain & Deployment (Future)
- [ ] 7.1 Configure wildcard subdomains
- [ ] 7.2 Test `[gym-slug].yourdomain.com` routing
