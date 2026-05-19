# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective

**REFACT-008 is COMPLETE — branch `refactor/REFACT-008-mobile-responsive`.**

**Current focus: Raise PR, merge REFACT-008 to main, then start CHORE-006 (Multi-Tenancy Verification).**

All 4 dashboard pages mobile UX done:
Members ✅ (`8014dd5`). Payments ✅ (`f9d15ce`). Attendance ✅ (`01f97bc`). Trainers ✅ (`3c5871a`).

**Roadmap agreed with owner:**
1. ✅ Members page mobile UX (`commit 8014dd5`)
2. ✅ Payments page mobile UX (`commit f9d15ce`)
3. ✅ Attendance page mobile UX (`commit 01f97bc`)
4. ✅ Trainers page mobile UX (`commit 3c5871a`) — **JUST COMPLETED**
5. 🔜 Raise PR + merge REFACT-008 to main, then CHORE-006
6. 🔜 Owner Profile / Support area (big feature, after all pages done)

**Pending before merging REFACT-008:**
- Raise PR from `refactor/REFACT-008-mobile-responsive` → `main`
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

### Active branch: `refactor/REFACT-008-mobile-responsive` — **COMPLETE — all 4 pages done**

**Status:** REFACT-008 Phase A + B + C + D all complete. PR ready to raise.

### Session commits (this session — Trainers mobile UX)
- `3c5871a` — Trainers page: profile section, two-button cards, mobile drawer+tabs, search, filter, FAB

### Previous session commits (same branch)
- `01f97bc` — Attendance mobile UX: filter sheet, card View Details btn, bell reminder, gated tr onClick
- `f9d15ce` — Payments mobile UX: Revenue Health panel, filter sheet, SortDropdown, CardActionBar, modal wiring
- `8014dd5` — Members mobile UX: FAB, filter sheet, card view-details btn, layout fix
- Phase A: bottom tab bar (`Nav.tsx`, `globals.css`)
- Phase B: table card-stack (`globals.css`, 3×`.css`, 3×`.tsx`)
- CSS bleed bug fix (`attendance.css` att-table scoping)
- Card elevation polish (`globals.css` responsive-table)

### Recently merged to main
- `chore/CHORE-005-error-boundaries` — route-level error handling (PR #12)
- `refactor/REFACT-007-trainers-page` — trainers page modularisation (PR #11)
- `feat/FEAT-004-attendance-checkin` — attendance check-in/out page, historical view, pagination, CSV, BUG-002, BUG-003 (PR #10)

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

## ✅ In Progress (Branch: `refactor/REFACT-008-mobile-responsive`)

13. **Mobile Responsiveness — REFACT-008** — **Phase A + B done; UX polish in progress**
    - ✅ 7 original steps (globals, dashboard, members, payments, attendance, trainers, Nav)
    - ✅ Drawer bug fixed: `MemberDrawer.css` + `PaymentDrawer.css` — `height: 100dvh`
    - ✅ Payments card bug fixed: `payments.css` — 2×2 grid, `clamp()` font
    - ✅ Dashboard mobile redesign: unified panels, StatCard `clamp()`, `.view-all-link`
    - ✅ **Phase A — Bottom tab bar**: `Nav.tsx` + `globals.css`
        - 5-icon fixed bottom bar (owner only, `≤640px`); active tab shows icon + label
        - Top bar: logo + `LogOut` icon only; `.sign-out-text` hidden, `.sign-out-icon-btn` shown
        - iOS safe-area padding on `.page`
    - ✅ **Phase B — Table card-stack**: `globals.css` + 3×`.css` + 3×`.tsx`
        - `.responsive-table` opt-in class; `data-label` on every `<td>`
        - `attendance/page.tsx` uses `att-table` extra class for scoped overrides
        - `attendance.css`: `td[data-label="Date"]:first-child` compound selector handles conditional Date column correctly in both Today and historical modes
    - ✅ **CSS bleed bug fix**: attendance overrides scoped to `.att-table`; `display:revert` → `display:block`
    - ✅ **Card elevation**: each `tbody tr` is `var(--bg3)` + border + `border-radius` + `8px` gap
    - ✅ **Members page mobile UX** (`commit 8014dd5`):
        - **FAB**: `.fab` shared class in `globals.css`; green fixed `+` button above tab bar; `members-add-btn` hides header button on mobile
        - **Filter sheet**: pill chip + slide-up bottom sheet; data-driven `filterSections[]` config — add new filter params by appending one object; shared CSS in `globals.css` (`.filter-chip`, `.filter-sheet*`, `.filter-sheet-reset`); Apply + Reset buttons
        - **State refactor**: `filter`+`branch` → single `activeFilters: FilterValues` record; `pendingFilters` for sheet pending state; `filtered` useMemo reads `activeFilters.*`
        - **Card View Details button**: `card-action-cell` + `card-action-btn` in `members.css`; hidden on desktop (≥641px); ghost button at bottom of each mobile card; `<tr>` onClick gated to `window.innerWidth > 640` so only button triggers drawer on mobile
        - **Layout fix**: `.page { margin: 0 }` at `≤900px` — prevents `margin: 0 auto` from squeezing content on mobile
    - ✅ **Payments page mobile UX** (`commit f9d15ce`):
        - **Revenue Health panel**: redesigned — green left-accent border, ambient glow, `collection rate %` badge (green dim, top-right), three horizontal proportional progress bars (Collected / Pending / Overdue), method chips at bottom. `clamp()` fluid font on amount.
        - **SortDropdown**: custom design-system dropdown (shared `globals.css` styles) in `.payments-controls-row`, side-by-side with filter chip
        - **Filter chip + sheet**: same pattern as Members (data-driven `filterSections[]`, status filter only)
        - **CardActionBar**: data-driven `CardAction[]` (`variant: primary | ghost | icon`) per record. Built by `getCardActions(r)` — computed once per row:
          - `pending` → Record Payment (primary) + View details (ghost) + 🔔 Bell (amber icon, top-right card header)
          - `overdue` → Renew (icon-only primary, `RefreshCw`) + Record Payment (ghost) + View details (ghost) + 🔔 Bell
          - `paid` / `superseded` → View details (ghost) only
        - **Modals wired**: `RenewMembershipModal` (memberId) + `RecordPaymentModal` (membershipId, remainingBalance, planPrice, currentAmountPaid) — reused from Members, no new hooks
        - **Bell icon position**: top-right of card header row (inline with avatar + name); `member-card-header` flex wrapper; `member-card-bell` hidden on desktop
        - **Card overflow fix**: `.table-wrap { overflow-x: hidden }` at ≤640px
        - **`CardAction.label` is optional** — Renew action is icon-only (no label) to save space in a 3-button row
        - ⚠️ **Send Reminder is a TODO stub** — `Bell` onClick is empty (`/* TODO: wire notification */`). Wire when FEAT-012 (WhatsApp/notification backend) is implemented.
    - ✅ **Attendance page mobile UX** (`commit 01f97bc`):
        - **Filter sheet**: combined Date Range (5 presets) + Payment Status (4 options) bottom sheet; `AttFilterValues` type; data-driven `filterSections[]`; filter chip with active-count badge; Apply + Reset; range tabs + status tabs hidden at ≤640px
        - **Card View Details button**: `att-card-action-cell` + `att-card-action-btn` in `attendance.css`; desktop hidden; full-width ghost button at bottom of each mobile card
        - **`tr` onClick gated**: `window.innerWidth > 640` guard — mobile drawer only via View Details button
        - **Bell reminder**: `att-card-bell` amber icon button (top-right of Member card header) shown for `pending` + `overdue` on ALL cards (today + historical); stub `/* TODO: FEAT-012 */`; `log-card-header` flex wrapper added to Member td
        - **Overflow fix**: `.table-wrap { overflow-x: hidden }` at ≤640px
        - **Export CSV**: label hidden on mobile (icon only via `.att-export-label { display: none }`)
    - ✅ **Trainers page mobile UX** (`commit 3c5871a`) — **COMPLETE**:
        - **AssignmentPanel enriched** (desktop): tappable `tel:` / `mailto:` links, branch chip (`MapPin`), "Since" date (`CalendarDays`), spec tag + duty badge side by side in `.ap-tags` row
        - **TrainerCard compact**: removed div onClick; removed divider + phone stat; two explicit side-by-side buttons — `Profile` (ghost border) and `Members (N)` (green tint with count badge)
        - **TrainerDrawer** (new — `TrainerDrawer.tsx` + `TrainerDrawer.css`): mobile bottom-sheet; **Profile/Members tab switcher**; `defaultTab` prop routes to correct tab on open; `drawerSlideUp` from `globals.css`; 44px touch targets on contact links; actions in Members tab
        - **Search bar + status filter**: `.toolbar` search input + desktop `.filter-tabs` (All / On duty / Off duty) + mobile `.filter-chip` → `.filter-sheet`; data-driven `filterSections[]`; `filtered` useMemo on query + statusFilter
        - **FAB**: `id="trainers-fab"` green fixed `+` button; `trainers-add-btn` class hides header button at `≤640px`
        - **Assignment panel hidden at ≤640px**: `TrainerDrawer` takes over; `.panel-empty` also hidden on mobile
        - **Workload bar removed**: `MAX_TRAINER_CAPACITY` was arbitrary — removed from both `AssignmentPanel` and `TrainerDrawer`

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
| 🔴 | REFACT-008 | **Mobile Responsiveness** | `refactor/REFACT-008-mobile-responsive` | All dashboard pages + both portals. Launch blocker. |
| 🔴 | CHORE-006 | **Multi-Tenancy Verification** | `chore/CHORE-006-multitenancy-verification` | Subdomain routing + RLS isolation audit across all tables |
| 🟠 | FEAT-006 | Pagination: Members \& Payments | `feat/FEAT-006-pagination` | Use same 25-row pattern as attendance page |
| 🟠 | FEAT-009 | Member Portal Rebuild | `feat/FEAT-009-member-portal-rebuild` | Mobile-first, self-service renewal, TanStack hooks, co-located CSS |
| 🟠 | FEAT-010 | Trainer Portal Rebuild | `feat/FEAT-010-trainer-portal-rebuild` | Mobile-first, attendance view for assigned members, TanStack hooks |
| 🟠 | FEAT-007 | Trainer Actions (Owner Dashboard) | `feat/FEAT-007-trainer-actions` | Add/Assign/Edit trainer modals — buttons already wired |
| 🟡 | CHORE-004 | Branch-Level Attendance | `feat/CHORE-004-branch-attendance` | Schema change: `branch` col on attendance table; multi-branch gyms |
| 🔵 | CHORE-001 | Atomic Member Creation | — | Supabase RPC/PostgreSQL transaction (replaces 2-step insert) |
| 🔵 | CHORE-002b | `pending → overdue` auto-transition | — | pg_cron daily job; client-side dedup workaround in place |
| 🔵 | CHORE-003 | Per-gym timezone | — | `gym_settings.timezone` + dynamic offset in date helpers |
| 🔵 | FEAT-008 | Loading Skeletons | `feat/FEAT-008-loading-skeletons` | CSS shimmer pattern — cosmetic, deferred |
| ⬛ | FEAT-011 | QR Check-In | — | Post-launch |
| ⬛ | FEAT-012 | WhatsApp Notifications | — | Post-launch |
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
