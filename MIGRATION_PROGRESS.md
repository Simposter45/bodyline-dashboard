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
- [x] 6.8 `app/login/page.tsx` cleanup (REFACT-006 Step 3 — **COMPLETE**, branch `refactor/REFACT-006-remaining-pages`)
    - Extracted 332-line inline `<style>` → `app/login/login.css`
    - Created `hooks/usePublicGymStats.ts` — anon-safe TanStack Query hook, explicit `.eq('gym_id')` filter (pre-auth safe), returns `{ memberCount, trainerCount }`
    - Replaced hardcoded `20+` members / `3` trainers with live DB counts
    - Three-state `gymId` pattern: `null` = query held, `string` = fetch (matches `usePlans`)
    - Also fixed: `todayFormatted()` + `currentMonthName()` added to `lib/utils/date.ts`; raw `new Date()` calls in `dashboard/page.tsx` and `payments/page.tsx` replaced
    - Also fixed: onboarding PowerShell UTF-8 encoding corruption (10 chars + Lucide icon swap)
- [x] 6.9 `app/dashboard/attendance/page.tsx` — **FEAT-004 Check-In/Check-Out** (branch `feat/FEAT-004-attendance-checkin`)
    - `hooks/useAttendance.ts` — TanStack Query, `queryKey: ["attendance", todayISO()]` (cache resets at midnight), `refetchInterval: 30s`
    - `hooks/useCheckin.ts` — `useCheckIn()` (insert row) + `useCheckOut()` (patch `check_out`); both invalidate `["attendance"]` + `["dashboard-stats"]`
    - `app/dashboard/attendance/attendance.css` — co-located styles (stat chips, check-in panel, log table)
    - `app/dashboard/attendance/page.tsx` — header stat chips, member search (active only, max 5, already-in guard), today's log table with inline check-out button
    - `components/ui/Nav.tsx` — Attendance link added for owner role (between Payments and Trainers)
    - `scripts/01_handoff_migration.sql` — RLS `att_gym_isolation` WITH CHECK now enforces role guard on INSERT/UPDATE (was missing)
    - **Confirmed**: 12 live attendance rows exist in DB; RLS working
- [x] 6.10 **FEAT-004b — Attendance page enhancements + historical view** (branch `feat/FEAT-004-attendance-checkin`, commit `36159a4`)
    - **BUG-002 fixed**: `todayRangeIST()` added to `lib/utils/date.ts`; `useAttendance` now uses IST-aware boundaries
    - `hooks/useMember.ts` — NEW single-member TanStack Query fetch (enables MemberDrawer from attendance log rows)
    - `hooks/useAttendance.ts` — refactored to `useAttendance(range: AttendanceDateRange, isLive?: bool)`; historical ranges skip 30s poll; each range cached independently by `[start, end]` key
    - `lib/utils/date.ts` — added `yesterdayRangeIST()`, `lastNDaysRangeIST(n)`, private `toISTDateString()`
    - `lib/utils/format.ts` — added `formatDuration(checkIn, checkOut)`, `formatShortDate(iso)`
    - Dashboard: check-ins panel capped at 5 rows + "View all N check-ins →" link
    - Attendance page full rewrite:
        - Member drawer on log row click (MemberDrawer reused, useMember fetches on demand)
        - Payment status column (zero extra DB calls — cross-refs cached members)
        - Log search bar + 3-stage payment status filter pipeline (All/Paid/Pending/Overdue)
        - Duration column (green=live, muted=historic)
        - Historical view: Today / Yesterday / Last 7 days / Last 30 days / Custom date range
        - Date column for non-Today ranges; Check Out button hidden for historical
        - Pagination: 25 rows/page, resets on any filter/range change
        - CSV export: full filtered dataset, no new npm dependencies
    - Deferred as CHORE-004: branch-level attendance filter (needs `branch` col on `attendance` table)
- [x] 6.11 **BUG-003 — IST date boundary fix** (branch `feat/FEAT-004-attendance-checkin`, commit `e44d2ab`)
    - `todayRangeIST()` was calling `todayISO()` which returns the UTC date string — wrong IST day between 00:00–05:30 IST
    - `useDashboardStats.ts` was using fully deprecated `todayRangeISO()` (UTC midnight boundary)
    - Fix: `todayRangeIST()` now uses `toISTDateString(new Date())` — consistent with `yesterdayRangeIST()` and `lastNDaysRangeIST()`
    - Fix: `useDashboardStats.ts` swapped to `todayRangeIST()` — dashboard attendance widget now shows correct IST-day check-ins
    - `todayRangeISO()` is now fully deprecated with zero active callers
- [x] 6.12 `app/dashboard/trainers/page.tsx` cleanup (`refactor/REFACT-007-trainers-page`) — **merged to main (PR #11)**
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
- [x] 6.13 **CHORE-005 — Route-level error boundaries** (branch `chore/CHORE-005-error-boundaries` — **merged to main (PR #12)**)
    - `components/ui/ErrorFallback.tsx` — shared crash UI: red-dim card, `AlertTriangle` icon, dev-only `error.message`, "Try again" (`reset()`) + "Dashboard" link
    - `app/globals.css` — extended `.error-screen` with sub-classes: `.error-card`, `.error-icon`, `.error-title`, `.error-message`, `.error-detail`, `.error-actions`, `.btn-retry`, `.btn-ghost-sm`
    - Five thin `error.tsx` wrappers added: `dashboard/`, `members/`, `payments/`, `attendance/`, `trainers/`
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
- **`BUG-002` — Attendance UTC date boundary** — **✅ FIXED** (FEAT-004b, commit `36159a4`)
  - Was: `hooks/useAttendance.ts` used `todayRangeISO()` (UTC midnight), missing check-ins before 5:30 AM IST.
  - Fix: `todayRangeIST()` added to `lib/utils/date.ts`; `useAttendance` refactored to accept `AttendanceDateRange` param; hook no longer owns date logic.
- **`BUG-003` — Attendance IST date boundary** — **✅ FIXED** (BUG-003, commit `e44d2ab`)
  - Was: `todayRangeIST()` called `todayISO()` which returns UTC date; `useDashboardStats` used `todayRangeISO()` (UTC midnight). Both caused check-ins between 00:00–05:30 IST to fall outside the query window.
  - Fix: `todayRangeIST()` now uses `toISTDateString(new Date())` (same pattern as other IST range helpers); `useDashboardStats` swapped to `todayRangeIST()`.
  - `todayRangeISO()` is now fully deprecated — no active callers remain.
- **`CHORE-004` — Branch-level attendance tracking** — **DEFERRED**
  - The `attendance` table has no `branch` column. Currently only `members.branch` (home branch) is available.
  - A member from Branch A visiting Branch B would show their home branch, not where they checked in.
  - Fix: add `branch` column to `attendance` table; operator selects/confirms branch at check-in time; UI shows a branch filter tab on the attendance page.
  - Non-blocking — home-branch filtering is useful and available now; location accuracy deferred.

## 🔧 Production Hardening & Launch Readiness

### 🔴 Launch Blockers
- [x] **CHORE-005 — Error boundaries**: `ErrorFallback` component + 5 route `error.tsx` files (**merged to main, PR #12**)
- [x] **REFACT-008 — Mobile Responsiveness** (branch `refactor/REFACT-008-mobile-responsive` — **COMPLETE — PR ready**)
    - ✅ Step 1: `globals.css` — shared breakpoints (`.page`, `.nav` 2-row scroll, `.toolbar`, `.table-wrap` edge-to-edge, touch targets)
    - ✅ Step 2: `dashboard.css` — stats grid 2-col collapse, greeting font scale, live-badge hidden on mobile
    - ✅ Step 3: `members.css` + `MemberDrawer.css` — column hiding added; `MemberDrawer.css` → `height: 100dvh` full-page overlay
    - ✅ Step 4: `payments.css` — summary card 2×2 grid (min-width:0), `clamp()` fluid font, dead `.drawer*` code removed, `PaymentDrawer.css` → `height: 100dvh`
    - ✅ Step 5: `attendance.css` — date range inputs stack, pagination stack
    - ✅ Step 6: `trainers.css` — card/panel padding, font scale, touch targets
    - ✅ Step 7: `Nav.tsx` — `aria-label` on scrollable mobile nav row
    - ✅ **Dashboard mobile redesign** (`commit 8582ea1`): StatCard `clamp()` font, unified Members + Revenue panels, `.view-all-link` class
    - ✅ **Phase A — Bottom tab bar** (`Nav.tsx` + `globals.css`):
        - 5-tab fixed bottom bar for owner role at `≤640px`; Lucide icons: `LayoutDashboard`, `Users`, `CreditCard`, `CalendarCheck`, `Dumbbell`
        - Active tab: icon + label. Inactive tabs: icon only. Active detection via `usePathname()` exact match.
        - Top bar collapses to logo + `LogOut` icon sign-out only (`.sign-out-text` hidden, `.sign-out-icon-btn` shown)
        - `.page { padding-bottom: calc(60px + env(safe-area-inset-bottom) + 20px) }` for iOS safe area
    - ✅ **Phase B — Table card-stack** (`globals.css` + 3×`.css` + 3×`.tsx`):
        - `globals.css`: `.responsive-table` opt-in block — hides `<thead>`, `tbody tr → display:block`, `td → flex label→value`, `td::before { content: attr(data-label) }`
        - `members.css` / `payments.css` / `attendance.css`: removed old `nth-child` column-hiding breakpoints
        - `members/page.tsx` + `payments/page.tsx` + `attendance/page.tsx`: `className="responsive-table"` on `<table>` + `data-label` on every `<td>`
        - `attendance/page.tsx`: `className="responsive-table att-table"` for scoped overrides
        - `attendance.css`: att-table-scoped overrides for conditional Date column (historical mode) using `td[data-label="Date"]:first-child` compound selector (specificity 0,3,2 beats globals 0,2,2)
    - ✅ **BUG — CSS bleed fix**: `attendance.css` overrides were targeting `table.responsive-table` globally, causing Members/Payments card headers to render right-aligned. Fixed by scoping all att-table overrides to `.att-table` class and replacing `display:revert` with `display:block`.
    - ✅ **Polish — Card elevation**: `globals.css` responsive-table `tbody tr` → `background:var(--bg3)`, `border`, `border-radius:var(--radius-sm)`, `margin:0 8px 8px` gap between cards. `table-wrap table { padding-top:8px }` for first-card breathing room.
- [ ] **CHORE-006 — Multi-Tenancy Verification** (branch `chore/CHORE-006-multitenancy-verification`)
    - Seed a second test gym in `gyms` + `gym_settings`
    - Verify subdomain middleware resolves `[gym-slug].localhost` correctly
    - RLS isolation audit: zero data leakage across all 7 tables between gyms
    - `usePublicGymStats` + `usePlans` confirmed per-gym scoped
- [ ] **FEAT-006 — Pagination**: Members and Payments tables (25-row pattern, same as attendance)
- [ ] **FEAT-009 — Member Portal Rebuild** (branch `feat/FEAT-009-member-portal-rebuild`)
    - 1,316-line monolith → TanStack hooks, co-located CSS, mobile-first, zero `useEffect`/`any`
    - New: self-service renewal request, expiry alert banner, full attendance history
- [ ] **FEAT-010 — Trainer Portal Rebuild** (branch `feat/FEAT-010-trainer-portal-rebuild`)
    - 1,196-line monolith → TanStack hooks, co-located CSS, mobile-first
    - New: assigned-member attendance view (who’s checked in today), member notes field
- [ ] **FEAT-007 — Trainer Actions** (owner dashboard — buttons wired, modals TBD)
    - `AddTrainerModal`, `AssignMemberModal`, `EditTrainerModal`

### 🟡 Important (Pre-Scale)
- [ ] **CHORE-004 — Branch-Level Attendance** — schema change: `branch` col on `attendance` table; multi-branch gym filter support

### 🔵 Technical Debt (Non-Blocking)
- [ ] Loading skeletons: Replace text "Loading..." with CSS skeleton shimmer pattern (cosmetic, deferred)
- [ ] **CHORE-001**: Atomic member creation (Supabase RPC/PostgreSQL transaction)
- [ ] **CHORE-002b**: pg_cron daily `pending → overdue` auto-transition
- [ ] **CHORE-003**: Per-gym timezone support (`gym_settings.timezone` + dynamic offset)

### ⬛ Post-Launch Backlog
- [ ] **FEAT-011 — QR Check-In**: Member scans QR → auto check-in (`/checkin?member=uuid`)
- [ ] **FEAT-012 — WhatsApp Notifications**: Expiry alerts + renewal confirmations via Twilio/WATI
- [ ] **FEAT-013 — Reports Dashboard**: Revenue trends, attendance heatmap, member growth (Recharts)
- [ ] **FEAT-014 — Excel Export**: `xlsx` library (deferred; CSV confirmed sufficient for now)

## 🚀 Phase 7: Domain & Deployment (Future)
- [ ] 7.1 Configure wildcard subdomains
- [ ] 7.2 Test `[gym-slug].yourdomain.com` routing
