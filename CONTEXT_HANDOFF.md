# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective

**FEAT-004b is COMPLETE and committed** (commit `36159a4` on `feat/FEAT-004-attendance-checkin`).

**Next action:** Open PR for `feat/FEAT-004-attendance-checkin` → `main`, then move to the items in the Next Tasks section below.

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

## 📍 Current Branch State

### Active branch: `feat/FEAT-004-attendance-checkin`

**Commits on this branch (pushed, not yet PRed):**
1. `feat(attendance): FEAT-004 - daily check-in/check-out page`
2. `fix(rls): enforce role guard on attendance INSERT/UPDATE`
3. `feat(checkin): FEAT-004b -- attendance page enhancements and historical view` ← latest

**Action needed:** Open PR to merge into `main`.

### Recently merged to main
- `refactor/REFACT-006-remaining-pages` — login + onboarding cleanup

---

## ✅ Fully Complete & Merged to Main

1. **Members Page (Golden UI Standard)** — `app/dashboard/members/page.tsx`
2. **Add Member Modal** — 3-step wizard, Zod validation, TanStack mutation
3. **Nav Component** — Attendance link added for owner
4. **Dashboard Page** — REFACT-004, zero `useEffect`, TanStack stats
5. **Renew & Record Payment Modals** — FEAT-003 ✅
6. **CHORE-002** — `superseded` payment status, client-side logic complete
7. **Payments Page** — REFACT-005, 1419 → 255 lines

---

## ✅ FEAT-004b — What Was Done This Session

All committed in `36159a4`. Full attendance page enhancements:

### BUG-002 Fixed
- `todayRangeIST()` added to `lib/utils/date.ts` — IST midnight boundary fix
- `useAttendance.ts` now uses IST-aware range (check-ins 00:00–05:30 IST no longer missed)

### New Utilities
| File | Added |
|------|-------|
| `lib/utils/date.ts` | `todayRangeIST()`, `yesterdayRangeIST()`, `lastNDaysRangeIST(n)`, `toISTDateString()` (private) |
| `lib/utils/format.ts` | `formatDuration(checkIn, checkOut)`, `formatShortDate(iso)` |

### New / Updated Hooks
| Hook | Change |
|------|--------|
| `hooks/useMember.ts` | **NEW** — single-member TanStack Query fetch (for drawer from attendance row) |
| `hooks/useAttendance.ts` | **Refactored** — now `useAttendance(range: AttendanceDateRange, isLive?: bool)`. Exports `AttendanceDateRange` type. Historical ranges skip 30s poll. Each range cached independently. |

### Dashboard Widget
- Check-ins panel capped at **5 rows**
- "View all N check-ins →" footer link shown when total > 5, routes to `/dashboard/attendance`

### Attendance Page (full rewrite)
- **Member drawer** on log row click (reuses `MemberDrawer.tsx`; `useMember(id)` fetches on demand)
- **Payment status column** — `paymentStatusMap` cross-refs cached `members` data (zero extra DB calls)
- **Log search bar** — filter by name or phone; "X of Y shown" count
- **Payment status filter tabs** — All / Paid / Pending / Overdue with live counts; 3-stage filter pipeline
- **Duration column** — `formatDuration()`; green for still-in (live), muted for checked-out
- **Historical view** — Today / Yesterday / Last 7 days / Last 30 days / Custom date range
- **Date column** — shown for non-Today ranges; `formatShortDate()`, IST-aware
- **Check Out button** — hidden for historical records (shows `—` for open rows)
- **Pagination** — 25 rows/page; Prev / `page / total` / Next; resets on any filter/range change
- **CSV export** — exports full `filteredLog` (not just current page); no new npm deps (Blob + createObjectURL)
- **Check-in panel** — hidden for historical ranges (only shown for Today)

### Deferred (logged)
- **CHORE-004** — Branch filter on attendance (needs `branch` column on `attendance` table + check-in location selection at check-in time). Member's home branch is in `members.branch` but doesn't tell you which branch they visited.

---

## 🔜 Next Tasks (Priority Order)

### 1. Merge FEAT-004 PR
Open PR: `feat/FEAT-004-attendance-checkin` → `main`

### 2. After merge — backlog

| Priority | ID | Task | Notes |
|----------|-----|------|-------|
| 🔴 | — | Error boundaries | Each route needs `error.tsx` |
| 🔴 | — | Loading skeletons | CSS skeleton pattern, replace text loaders |
| 🟠 | CHORE-002b | `pending → overdue` auto-transition | pg_cron daily job; client-side dedup workaround in place |
| 🔵 | CHORE-003 | Per-gym timezone | `gym_settings.timezone` column + dynamic offset in date helpers |
| 🔵 | CHORE-001 | Atomic member creation | Supabase RPC/PostgreSQL transaction (replaces 2-step insert) |
| 🔵 | CHORE-004 | Branch filter on attendance | Add `branch` col to `attendance` table; location selected at check-in |
| 🔵 | FEAT-005 | Excel export | `xlsx` library; defer until CSV is confirmed insufficient |

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
  useMember.ts                   ✅ NEW — single-member fetch (attendance drawer)
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
                   currentMonthName, sevenDaysFromNow, addDays, todayRangeISO (deprecated)
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
- Error boundaries: each route needs `error.tsx`
- Loading skeletons: replace text loaders with CSS skeleton pattern
- `CHORE-002b`: pg_cron daily `pending → overdue` auto-transition
- `CHORE-003`: Per-gym timezone support
- `CHORE-004`: Branch-level attendance tracking (schema change needed)
