# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective

**CHORE-006 is COMPLETE — branch `chore/CHORE-006-multitenancy-verification`.**

**Current focus: Raise PR, merge CHORE-006 to main, then proceed to the next production launch blockers (e.g. pagination or portal rebuilds).**

All multi-tenancy verification and dynamic branding steps are complete and verified:
Seeding ✅ (`10492f1`). Subdomain Middleware ✅ (`5e3f6c4`). RLS audit ✅ (`c22ce0c`). Anon policies ✅ (`e9fce97`). Onboarding guard ✅ (`98690cc`). Dynamic branding overlays ✅ (`0d14196`).

**Roadmap agreed with owner:**
1. ✅ REFACT-008: Mobile Responsiveness (all 4 pages)
2. ✅ CHORE-006: Multi-Tenancy Verification & Dynamic Branding — **JUST COMPLETED**
3. 🔜 FEAT-006: Pagination on Members and Payments (25-row pattern)
4. 🔜 FEAT-009: Member Portal Rebuild (mobile-first, TanStack hooks)

**Pending before merging CHORE-006:**
- Raise PR from `chore/CHORE-006-multitenancy-verification` → `main`
- Review + merge

---

## 🏗️ Architectural Core
- **Framework**: Next.js 16.2.1 (App Router) + Supabase SSR. Never use Pages Router.
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS is ACTIVE and HARDENED. `current_gym_id()` and `get_my_role()` are source of truth. Never filter by gym_id client-side.
- **Styling**: Co-located `.css` files (one per page/component). Global tokens in `app/globals.css`. No Tailwind + vanilla mixing. Always check `globals.css` before writing any new class.
- **Data Fetching**: TanStack Query (hooks in `hooks/`) for ALL DB ops. No raw `useEffect` fetching.
- **Forms**: React Hook Form + Zod. Schema in `lib/validations/<entity>.ts`. Always `zodResolver`.
- **Toasts**: `react-hot-toast`. `toast.success()` / `toast.error()` only. `<Toaster />` in `app/layout.tsx`.
- **Icons**: `lucide-react` only. No raw emoji strings in JSX (PowerShell encoding risk).

---

## 🛣️ Current Branch State

### Active branch: `chore/CHORE-006-multitenancy-verification` — **COMPLETE**

**Status:** CHORE-006 steps are complete. Data isolation and dynamic branding verified. Ready for PR.

### Session commits (this branch)
- `0d14196` — Implement dynamic branding color overlays on dashboard (status pills, Nav, MemberDrawer)
- `98690cc` — Onboarding: add `!settings?.gym_id` guard to prevent headless submission
- `e9fce97` — SQL: tighten database RLS anon-read and anon-insert policies
- `c22ce0c` — SQL: write full RLS audit verification queries across all 8 tables
- `5e3f6c4` — Middleware: add local dev `?gym=slug` query param routing support
- `10492f1` — SQL: seed test gym "Iron Temple" with appropriate check constraints

### Recently merged to main
- `refactor/REFACT-008-mobile-responsive` — Mobile responsiveness for all 4 dashboard pages + bottom tab bar
- `chore/CHORE-005-error-boundaries` — Route-level error boundaries

---

## ✅ Fully Complete & Merged to Main

1. **Members Page (Golden UI Standard)** — `app/dashboard/members/page.tsx`
2. **Add Member Modal** — 3-step wizard, Zod validation, TanStack mutation
3. **Nav Component** — Attendance link added for owner role
4. **Dashboard Page** — REFACT-004, zero `useEffect`, TanStack stats
5. **Renew & Record Payment Modals** — FEAT-003 ✅
6. **CHORE-002** — `superseded` payment status, client-side logic complete
7. **Payments Page** — REFACT-005, 1419 → 255 lines
8. **Login Page** — REFACT-006, live gym stats via `usePublicGymStats`
9. **Onboarding Page** — REFACT-006, dynamic branches, shared utils
10. **Attendance Page** — FEAT-004 + FEAT-004b: check-in/out, historical view, pagination, CSV export, IST-aware date queries
11. **Trainers Page** — REFACT-007: `useTrainers` hook, co-located CSS, 861 → ~210 lines
12. **Error Boundaries** — CHORE-005: `ErrorFallback` + 5 route `error.tsx` files
13. **Mobile Responsiveness — REFACT-008** — **Phase A + B + C + D done & merged to main**
    - Fixed bottom tab bar (owner only, `≤640px`)
    - Responsive card stacks for members, payments, attendance, trainers
    - Dashboard mobile redesign: unified panels, compact StatCards, View All check-ins
    - Responsive filter sheets & slide-up drawer panel polish

## ✅ In Progress (Branch: `chore/CHORE-006-multitenancy-verification`)

14. **Multi-Tenancy Verification — CHORE-006** — **JUST COMPLETED**
    - ✅ Seed test gym "Iron Temple" with appropriate schema constraint overrides
    - ✅ Hardened database RLS anon-read & anon-insert policies
    - ✅ Implemented `?gym=slug` local dev subdomain bypass
    - ✅ Audited RLS tenant isolation across all 8 tables (100% isolated)
    - ✅ Added onboarding submission guard
    - ✅ Implemented dynamic branding skinning based on the gym's `primary_color` (Bodyline = Green, Iron Temple = Blue)

    - ✅ **Payments page mobile UX** (`commit f9d15ce`):
        - **Revenue Health panel**: redesigned — green left-accent border, ambient glow, `collection rate %` badge (green dim, top-right), three horizontal proportional progress bars (Collected / Pending / Overdue), method chips at bottom. `clamp()` fluid font on amount.
        - **SortDropdown**: custom design-system dropdown (shared `globals.css` styles) in `.payments-controls-row`, side-by-side with filter chip
        - **Filter chip + sheet**: same pattern as Members (data-driven `filterSections[]`, status filter only)
        - **CardActionBar**: data-driven `CardAction[]` (`variant: primary | ghost | icon`) per record. Built by `getCardActions(r)` — computed once per row:
          - `pending` → Record Payment (primary) + View details (ghost) + 🔔 Bell (amber icon, top-right card header)
    - ✅ **Payments page mobile UX**: redesigned Revenue Health panel, custom SortDropdown, mobile-optimized filter sheet, and card-based actions.
    - ✅ **Attendance page mobile UX**: mobile-optimized filter sheet, card-based actions, and responsive layout adjustments.
    - ✅ **Trainers page mobile UX**: TrainerDrawer bottom-sheet, compact card layout, and mobile-optimized search/filters.

---


## ✅ REFACT-007 — What Was Done Last Session

### Branch: `refactor/REFACT-007-trainers-page` (based off `origin/main` @ `5d66885`)

**Problem:** `app/dashboard/trainers/page.tsx` was 861 lines — a pre-modularisation monolith with:
- Raw `useEffect` for data fetching
- 450-line inline `<style>` block (with `:root`, `body`, nav, global duplicates)
- Hardcoded `"Pradeep · Owner"` in a custom nav (not using `<Nav />`)
- Raw inline SVG icons instead of `lucide-react`
- Local `getInitials()` and `formatDate()` duplicating `lib/utils/format.ts`
- Wrong Supabase import path (`@/lib/supabase` instead of `@/lib/supabase/client`)
- `assignmentsRes.error` was silently ignored (only `trainersRes.error` was checked)

**What was built:**

#### Step 1 — `hooks/useTrainers.ts`
- TanStack Query hook, `queryKey: ["trainers"]`
- `Promise.all` parallel fetch: `trainers` + `trainer_assignments` (with `members` join, `is_current = true`)
- Exports `TrainerWithAssignments` type (Trainer & { assignments: (TrainerAssignment & { member: Member })[] })
- Both `trainersRes.error` AND `assignmentsRes.error` now checked (bug fix)
- 60s staleTime, 5min gcTime

#### Step 2 — `app/dashboard/trainers/trainers.css`
- 450-line `<style>` block extracted to co-located CSS file
- Removed all global duplicates: `:root`, `body`, `*`, `::-webkit-scrollbar`, `@import`, `.nav*`, `.page*`, `.loading*`, `.error-screen`
- Kept trainer-specific only: `.trainers-layout`, `.trainer-card*`, `.trainer-active-badge`, `.trainer-spec-tag`, `.trainer-card-stats`, `.assignment-panel`, `.ap-*`, `.panel-empty`
- `99px` hardcoded values → `var(--radius-pill)` token

#### Step 3 — `app/dashboard/trainers/page.tsx` rewrite
- 861 → ~210 lines
- `<Nav role="owner" />` replaces custom nav + hardcoded `"Pradeep · Owner"`
- `useTrainers()` replaces raw `useEffect` + local `fetchTrainers()`
- `getInitials`, `formatDate` from `lib/utils/format.ts` (local copies removed)
- `<Phone />`, `<Mail />`, `<Plus />` from `lucide-react` (raw SVGs removed)
- `.btn-solid` global class replaces local `.add-btn`
- `trainer.phone` null-guard added (was rendering null — `phone: string | null` in types)
- Auto-select first trainer via pure derivation, no `useEffect`
- `import "./trainers.css"` wired

#### Step 4 — `types/index.ts` verified
- Zero changes needed. `Trainer`, `TrainerAssignment`, `Member` all correct.
- `TrainerWithMembers` (lighter shape in types) is distinct from `TrainerWithAssignments` (richer, in hook) — no conflict.

#### Merge
- `origin/main` (with FEAT-004 attendance) merged into branch mid-work
- Single conflict in `MIGRATION_PROGRESS.md` — resolved by keeping full FEAT-004 history (6.8–6.11) from main + adding REFACT-007 as 6.12

**TypeScript:** `npx tsc --noEmit` — **0 errors** (verified post-merge)

---

## 🔜 Next Tasks (Priority Order)

| Priority | ID | Task | Branch | Notes |
|----------|-----|------|--------|-------|
| 🔴 | FEAT-006 | **Pagination: Members & Payments** | `feat/FEAT-006-pagination` | Use same 25-row pattern as attendance page |
| 🔴 | FEAT-009 | **Member Portal Rebuild** | `feat/FEAT-009-member-portal-rebuild` | Mobile-first, self-service renewal, TanStack hooks, co-located CSS |
| 🔴 | FEAT-010 | **Trainer Portal Rebuild** | `feat/FEAT-010-trainer-portal-rebuild` | Mobile-first, attendance view for assigned members, TanStack hooks |
| 🟠 | FEAT-007 | **Trainer Actions (Owner Dashboard)** | `feat/FEAT-007-trainer-actions` | Add/Assign/Edit trainer modals — buttons already wired |
| 🟡 | CHORE-004 | **Branch-Level Attendance** | `feat/CHORE-004-branch-attendance` | Schema change: `branch` col on attendance table; multi-branch gyms |
| 🔵 | CHORE-001 | **Atomic Member Creation** | — | Supabase RPC/PostgreSQL transaction (replaces 2-step insert) |
| 🔵 | CHORE-002b | `pending → overdue` auto-transition | — | pg_cron daily job; client-side dedup workaround in place |
| 🔵 | CHORE-003 | Per-gym timezone | — | `gym_settings.timezone` + dynamic offset in date helpers |
| 🔵 | FEAT-008 | Loading Skeletons | `feat/FEAT-008-loading-skeletons` | CSS shimmer pattern — cosmetic, deferred |
| ⬛ | FEAT-011 | QR Check-In | — | Post-launch |
| ⬛ | FEAT-013 | Reports Dashboard | — | Post-launch |

---

## 🗂️ Key File Structure (Current)

```
app/
  globals.css                    ← Design tokens + shared UI classes (check here first)
  layout.tsx                     ← <Toaster /> from react-hot-toast
  login/
    page.tsx                     ✅ Cleaned up (REFACT-006)
    login.css
  dashboard/
    page.tsx                     ✅ FEAT-004b: check-ins capped at 5 + "View all" link
    dashboard.css
    attendance/
      page.tsx                   ✅ FEAT-004b full rewrite (historical view, pagination, CSV)
      attendance.css             ✅ range selector + pagination CSS added
    members/
      page.tsx                   ✅ Golden UI reference (source of truth for design)
      members.css
      MemberDrawer.tsx           ✅ Reused from attendance page via useMember(id)
      MemberDrawer.css
    payments/
      page.tsx                   ✅ REFACT-005
      payments.css
      PaymentDrawer.tsx
      PaymentDrawer.css
    trainers/
      TrainerDrawer.tsx           ✅ REFACT-008 Phase D — mobile bottom-sheet, Profile/Members tabs
      TrainerDrawer.css
  onboarding/
    page.tsx                     ✅ Cleaned up (REFACT-006)
    onboarding.css
components/
  ui/
    Nav.tsx                      ✅ Attendance link added (owner role)
    Modal.tsx, Avatar.tsx, StatCard.tsx, StatusPill.tsx, Panel.tsx
  members/
    AddMemberModal.tsx           ✅ 3-step wizard
    RenewMembershipModal.tsx     ✅
    RecordPaymentModal.tsx       ✅
hooks/
  useMembers.ts                  ✅ TanStack Query
  useMember.ts                   ✅ single-member fetch (attendance drawer)
  useTrainers.ts                 ✅ REFACT-007 — TanStack Query, TrainerWithAssignments type
  usePayments.ts                 ✅ TanStack Query
  useAttendance.ts               ✅ FEAT-004b — param-driven range + isLive flag
  useCheckin.ts                  ✅ useCheckIn + useCheckOut mutations
  usePublicGymStats.ts           ✅ anon-safe member/trainer counts (login page)
  useCreateMember.ts, useRenewMembership.ts, useRecordPayment.ts
  usePlans.ts, useGymSettings.ts, useDashboardStats.ts, useCurrentUser.ts
lib/
  utils/
    format.ts   ← formatINR, formatDate, formatTime, getInitials, getGreeting,
                   formatDuration, formatShortDate
    date.ts     ← todayISO, todayRangeIST, yesterdayRangeIST, lastNDaysRangeIST,
                   monthStartISO, monthStartISTTimestamp, todayFormatted,
                   currentMonthName, sevenDaysFromNow, addDays
                   todayRangeISO — ⚠️ FULLY DEPRECATED, do not use (UTC midnight boundary)
  constants/
    design.ts, status.ts
  members/
    status.ts, filters.ts
  validations/
    member.ts
types/
  index.ts                       ← All shared TypeScript types
scripts/
  01_handoff_migration.sql       ✅ RLS att_gym_isolation WITH CHECK enforces role guard
  02_public_rls_policies.sql
```

---

## ⚠️ Known Conventions (AGENTS.md §9)

### Date Handling
- Always use `lib/utils/date.ts` helpers. Never `new Date().toISOString()` directly.
- IST-aware queries: `todayRangeIST()`, `yesterdayRangeIST()`, `lastNDaysRangeIST(n)`, `monthStartISTTimestamp()`
- `todayRangeISO()` is **deprecated** — IST-unaware, do not use for attendance queries

### CSS
- Co-located `.css` files only. No `<style jsx>`. No Tailwind + vanilla mixing.
- Always check `globals.css` first before writing any style.
- Key global classes: `.toolbar`, `.filter-tabs`, `.filter-tab`, `.filter-count`, `.search-wrap`, `.search-input`, `.table-wrap`, `.table-meta`, `.empty-state`, `.btn-solid`, `.page`, `.page-header`

### Error Handling
```ts
catch (error: unknown) {
  const msg = error instanceof Error ? error.message : "Something went wrong";
  toast.error(msg);
}
```

### Supabase Pattern
```ts
const { data, error } = await supabase.from("table").select("*");
if (error) throw error; // always check before accessing data
```

---

## 🧪 Local Testing
- `npm run dev` (already running on port 3000)
- Test subdomains: `bodyline.localhost` or `?gym=slug` query param
- TypeScript check: `npx tsc --noEmit` — must return **0 errors** before any commit

---

## 🚩 Pending Production Items

### 🔴 Launch Blockers
- **REFACT-008**: Mobile responsiveness — all dashboard pages + both portals (`62vw` max-width breaks on mobile)
- **CHORE-006**: Multi-tenancy verification — subdomain routing + RLS isolation audit for second gym
- **FEAT-006**: Pagination on Members and Payments (25-row pattern, same as attendance)
- **FEAT-009**: Member portal rebuild — mobile-first, TanStack hooks, self-service renewal
- **FEAT-010**: Trainer portal rebuild — mobile-first, TanStack hooks, assigned-member attendance view
- **FEAT-007**: Trainer action modals (Add Trainer, Assign Member, Edit Trainer)

### 🟡 Important (Pre-Scale)
- **CHORE-004**: Branch-level attendance tracking (schema change: `branch` col on attendance table)

### 🔵 Technical Debt (Non-Blocking)
- `CHORE-001`: Atomic member creation (Supabase RPC)
- `CHORE-002b`: pg_cron daily `pending → overdue` auto-transition
- `CHORE-003`: Per-gym timezone support
- `FEAT-008`: Loading skeletons (cosmetic, deferred)

### ⬛ Post-Launch
- `FEAT-011`: QR Check-In
- `FEAT-012`: WhatsApp Notifications
- `FEAT-013`: Reports Dashboard
