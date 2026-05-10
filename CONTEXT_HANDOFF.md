# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
**FEAT-004b** — Attendance page enhancements (next chat, branch `feat/FEAT-004-attendance-checkin`):
1. **Member drawer on log row click** — clicking any row in "Today's Log" should open a member detail drawer showing member info + payment status (similar to `MemberDrawer.tsx` used on members page, or a lightweight read-only variant)
2. **BUG-002 fix** — `useAttendance.ts` UTC date boundary (see bug section below)

Then: publish `feat/FEAT-004-attendance-checkin`, create PR.

---

## 🏗️ Architectural Core
- **Framework**: Next.js 16.2.1 (App Router) + Supabase SSR. Use Next.js 16.2.1 with App Router (never Pages Router).
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS (Row Level Security) is ACTIVE and HARDENED. Helper functions `current_gym_id()` and `get_my_role()` are the source of truth.
- **Styling**: Co-located `.css` files (one per page, one per extracted component). Global tokens in `app/globals.css`. No Tailwind mixing with vanilla CSS.
- **Data Fetching**: TanStack Query (via custom hooks in `hooks/`) for all database operations. No raw `useEffect` fetching.
- **Forms**: React Hook Form + Zod. Schema in `lib/validations/<entity>.ts`. Always `zodResolver`.
- **Toasts**: `react-hot-toast`. `toast.success()` / `toast.error()` only. `<Toaster />` is in `app/layout.tsx`.

---

## 📍 Current Branch State

### Active branch: `feat/FEAT-004-attendance-checkin`

**Commits on this branch (not yet pushed/PRed):**
1. `feat(attendance): FEAT-004 - daily check-in/check-out page` — all 5 steps
2. `fix(rls): enforce role guard on attendance INSERT/UPDATE`

**To push:** `git push -u origin feat/FEAT-004-attendance-checkin`

### Recently merged / PR-ready branches
- `refactor/REFACT-006-remaining-pages` — pushed, PR open (login + onboarding cleanup + encoding fixes)

---

## ✅ Fully Complete & Merged to Main

1. **Members Page (Golden UI Standard)** — `app/dashboard/members/page.tsx`
2. **Add Member Modal** — `components/members/AddMemberModal.tsx` (3-step wizard)
3. **Nav Component** — `components/ui/Nav.tsx` (now includes Attendance link for owner)
4. **Dashboard Page Cleanup** — `app/dashboard/page.tsx` (REFACT-004)
5. **Renew & Record Payment Modals** — `FEAT-003` ✅ merged to main
6. **CHORE-002** — `superseded` payment status, client-side logic complete
7. **Payments Page Cleanup** — `app/dashboard/payments/page.tsx` (REFACT-005)

---

## 🔜 Next Tasks (Priority Order)

### 1. FEAT-004b — Attendance Page Enhancements ← **START HERE**
**Branch**: `feat/FEAT-004-attendance-checkin` (already checked out)

#### a) Member drawer on log row click
- Clicking a row in the "Today's Log" table should open a drawer showing:
  - Member photo, name, phone, email
  - Current membership plan + status (paid/pending/overdue)
  - Payment method, start/end dates
- **Reuse options** (evaluate in order):
  1. **Preferred**: `MemberDrawer.tsx` is already fully built at `app/dashboard/members/MemberDrawer.tsx`. Check if it can be used as-is — it accepts a `member: MemberFull` prop. Need to fetch the full member data when a row is clicked (by `member_id` from the attendance record). May need a `useMember(id)` hook that fetches a single member.
  2. **Alternative**: A lightweight read-only `AttendanceMemberPanel` if `MemberDrawer` is too tightly coupled to members-page-specific actions (Renew, Record Payment) that shouldn't appear from the attendance context.
- The drawer should also have the Renew/Record Payment actions if the member's payment is overdue or pending — so full `MemberDrawer` reuse is ideal.

#### b) BUG-002 — UTC date boundary fix
In `hooks/useAttendance.ts`, replace `todayRangeISO()` with IST-aware range:
```ts
// Current (wrong — UTC midnight, not IST midnight)
const { start, end } = todayRangeISO();

// Fix — IST midnight → UTC
const istStart = new Date(`${todayISO()}T00:00:00+05:30`).toISOString();
const istEnd   = new Date(`${todayISO()}T23:59:59+05:30`).toISOString();
```
Same pattern as `monthStartISTTimestamp()` in `lib/utils/date.ts`. Consider adding `todayRangeIST()` to that file so it's reusable.

---

### 2. After FEAT-004 PR is merged

| Priority | Task | Notes |
|----------|------|-------|
| 🟠 | Error boundaries | Each route needs `error.tsx` |
| 🟠 | Loading skeletons | Replace text "Loading..." with CSS skeleton pattern |
| 🔵 | `CHORE-002b` | pg_cron job: `pending → overdue` daily auto-transition |
| 🔵 | `CHORE-003` | Per-gym timezone (needs `gym_settings.timezone` column) |
| 🔵 | `CHORE-001` | Atomic member creation via Supabase RPC |

---

## 🗂️ Key File Structure (Current)
```
app/
  globals.css                    ← Design tokens, shared UI (DO NOT duplicate here)
  layout.tsx                     ← Has <Toaster /> from react-hot-toast
  login/
    page.tsx                     ← ✅ Cleaned up (REFACT-006 Step 3)
    login.css                    ← ✅ Co-located styles
  dashboard/
    page.tsx                     ← ✅ Refactored (REFACT-004)
    dashboard.css                ← ✅ Co-located styles
    attendance/
      page.tsx                   ← ✅ FEAT-004 (branch: feat/FEAT-004-attendance-checkin)
      attendance.css             ← ✅ Co-located styles
    members/
      page.tsx                   ← ✅ Golden UI reference
      members.css
      MemberDrawer.tsx           ← ✅ Full member detail drawer (reuse for attendance!)
      MemberDrawer.css
    payments/
      page.tsx                   ← ✅ Refactored (REFACT-005)
      payments.css
      PaymentDrawer.tsx          ← ✅ Payment detail drawer
      PaymentDrawer.css
  onboarding/
    page.tsx                     ← ✅ Cleaned up (REFACT-006 Step 2)
    onboarding.css
components/
  ui/
    Nav.tsx                      ← ✅ Attendance link added
    Modal.tsx, Avatar.tsx, StatCard.tsx, StatusPill.tsx, Panel.tsx
  members/
    AddMemberModal.tsx           ← ✅ 3-step wizard
    RenewMembershipModal.tsx     ← ✅
    RecordPaymentModal.tsx       ← ✅
hooks/
  useMembers.ts                  ← ✅ TanStack Query
  usePayments.ts                 ← ✅ TanStack Query
  useAttendance.ts               ← ✅ NEW (FEAT-004) — 30s refetch, midnight cache reset
  useCheckin.ts                  ← ✅ NEW (FEAT-004) — useCheckIn + useCheckOut mutations
  usePublicGymStats.ts           ← ✅ NEW (REFACT-006) — anon-safe member/trainer counts
  useCreateMember.ts, useRenewMembership.ts, useRecordPayment.ts
  usePlans.ts, useGymSettings.ts, useDashboardStats.ts, useCurrentUser.ts
lib/
  utils/
    format.ts                    ← formatINR, formatDate, formatTime, getInitials, getGreeting
    date.ts                      ← todayISO, monthStartISO, sevenDaysFromNow, addDays,
                                    todayRangeISO, monthStartISTTimestamp,
                                    todayFormatted, currentMonthName
  constants/
    design.ts, status.ts
  members/
    status.ts, filters.ts
  validations/
    member.ts
types/
  index.ts                       ← All shared TypeScript types
scripts/
  01_handoff_migration.sql       ← ✅ RLS att_gym_isolation WITH CHECK fixed this session
  02_public_rls_policies.sql
```

---

## ⚠️ Known Bugs & Decisions

### BUG-002 — Attendance UTC date boundary (NOT YET FIXED)
`useAttendance.ts` uses `todayRangeISO()` → UTC midnight. Check-ins before 5:30 AM IST won't appear on the attendance page. Fix before go-live (see FEAT-004b above).

### RLS: Attendance table
`att_gym_isolation` policy is now fully hardened — `WITH CHECK` enforces role guard on INSERT/UPDATE. Applied in Supabase directly. Migration file updated.

### Live update mechanism
`useAttendance` polls every 30s via `refetchInterval`. It is **not** Supabase Realtime — it's TanStack Query polling. Tab must be focused for polling to run. On mutation (check-in/check-out), both `["attendance"]` and `["dashboard-stats"]` caches are invalidated immediately.

### Double check-in guard
`inGymMemberIds` Set built from open attendance rows — shows "Already in gym" badge in search results instead of the check-in button. Prevents duplicate open rows from the same device. NOT a DB-level constraint (see CHORE-001 pattern).

---

## ⚠️ Known Conventions (AGENTS.md §9)

### CSS
- Co-located `.css` files only. No `<style jsx>`. No Tailwind mixing with vanilla CSS.
- Always check `globals.css` first before writing any style.

### Date Handling
- Use `lib/utils/date.ts` helpers. Never `new Date().toISOString()` in components.
- For IST-aware queries: `monthStartISTTimestamp()`, and the upcoming `todayRangeIST()`.

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

### Icons
Use `lucide-react` components only. No raw emoji strings in JSX (PowerShell encoding risk).

---

## 🧪 Local Testing
- `npm run dev` (already running)
- Test subdomains: `bodyline.localhost` or `?gym=slug` param
- TypeScript check: `npx tsc --noEmit` (must return 0 errors before any commit)

---

## 🚩 Pending Production Items
- Error boundaries: each page needs `error.tsx`
- Loading skeletons: replace text-only loading screens with CSS skeleton pattern
- `CHORE-002b`: pg_cron daily `pending → overdue` transition
- `CHORE-003`: Per-gym timezone support
