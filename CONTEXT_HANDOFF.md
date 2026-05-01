# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
REFACT-006 Steps 1 & 2 are **complete and committed** on branch `refactor/REFACT-006-remaining-pages`. Next task is **Step 3 — `login/page.tsx`** (extract styles to `login.css`, pull real DB stats for left panel from `useGymSettings` + a new `usePublicGymStats` hook).

## 🏗️ Architectural Core
- **Framework**: Next.js 16.2.1 (App Router) + Supabase SSR. Use Next.js 16.2.1 with App Router (never Pages Router).
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS (Row Level Security) is ACTIVE and HARDENED. Helper functions `current_gym_id()` and `get_my_role()` are the source of truth.
- **Styling**: Co-located `.css` files (one per page, one per extracted component). Global tokens in `app/globals.css`. Tailwind is installed and may be used for **new** pages/components after REFACT-004.
- **Data Fetching**: TanStack Query (via custom hooks in `hooks/`) for all database operations. No raw `useEffect` fetching.
- **Forms**: React Hook Form + Zod. Schema in `lib/validations/<entity>.ts`. Always `zodResolver`.
- **Toasts**: `react-hot-toast`. `toast.success()` / `toast.error()` only. `<Toaster />` is in `app/layout.tsx`.

## 📍 Current `main` Branch State

### ✅ Fully Complete & Merged
1. **Members Page (Golden UI Standard)** — `app/dashboard/members/page.tsx`
   - ~347 lines (was 1360+). Fully modular.
   - `MemberDrawer.tsx` + `MemberDrawer.css` extracted
   - `members.css` co-located for page-specific styles
   - `hooks/useMembers.ts` — TanStack Query, RLS-scoped
   - `lib/utils/format.ts`, `lib/utils/date.ts` — pure utilities
   - `lib/constants/design.ts`, `lib/constants/status.ts` — design tokens
   - `lib/members/status.ts`, `lib/members/filters.ts` — business logic

2. **Add Member Modal** — `components/members/AddMemberModal.tsx`
   - 3-step wizard: Details → Payment → Success
   - React Hook Form + Zod (`lib/validations/member.ts`)
   - `hooks/useCreateMember.ts` + `hooks/usePlans.ts`
   - QR code display for UPI payments
   - Wired to members page via `isAddModalOpen` state

3. **Nav Component** — `components/ui/Nav.tsx`
   - Self-contained auth fetch (no prop drilling)
   - Brand logo is a real `<a href="/">` link (accessible)
   - Role-scoped links (owner / trainer / member)

4. **AGENTS.md** — Updated with Section 9: full coding conventions
   - Forms, CSS, catch blocks, date utilities, loading states, Supabase pattern, toasts, icons

4. **Dashboard Page Cleanup** — `app/dashboard/page.tsx` (`REFACT-004`)
   - Fully refactored to use TanStack Query (`useDashboardStats`, `useCurrentUser`).
   - UI aligned with Golden UI standards, removed `useEffect` and inline styles.

5. **Renew & Record Payment Modals** — `feat/FEAT-003-renew-and-record-payment` ✅ **merged to main**
   - Added validation schemas with `.max()` balance enforcement.
   - `useRenewMembership` and `useRecordPayment` mutation hooks built.
   - Modals fully integrated into `MemberDrawer.tsx` matching Golden UI.

7. **REFACT-006 Steps 1 & 2** — `refactor/REFACT-006-remaining-pages` ✅ **in progress (2 of 3 steps done)**
   - **Step 1**: `hooks/usePlans.ts` — upgraded with `gymId?: string | null` three-state pattern:
     - `undefined` (no arg) → relies on RLS, `enabled: true` — dashboard callers unchanged
     - `null` → query held (`enabled: false`) — used while `useGymSettings` is still loading
     - `string` → explicit `.eq("gym_id", gymId)` filter — used by pre-auth pages
   - **Step 2**: `app/onboarding/page.tsx` + `app/onboarding/onboarding.css`:
     - 1,471 → 934 lines. Inline `<style>` (500 lines) extracted to `onboarding.css`
     - Local `:root {}` block removed; CSS aliases now map to design tokens in `onboarding.css`
     - Local `formatINR()`, `addDays()` removed → import from `lib/utils/`
     - `new Date().toISOString()` × 2 → `todayISO()`
     - Raw plans `useEffect` + `useState<Plan[]>` → `usePlans(settings?.gym_id ?? null)`
     - **Hardcoded branches** `["Sector 14", "DLF Phase 1", "Sohna Road"]` → `settings?.branches ?? []`
     - **Step 2 copy** hardcoded "all 3 branches" → dynamic from `settings.branches.length`
     - Encoding corruption (PowerShell double-encode) fixed throughout
   - **Step 3 (next)**: `app/login/page.tsx` — see section below

### Last actions
- `refactor/REFACT-005-payments-cleanup` is complete (4 commits + 2 fixes). Pushed. Ready for PR.
- `CHORE-002` formally defined — see section below.

## 🔜 Next Tasks (In Priority Order)

### 1. REFACT-006 Step 3 — `login/page.tsx` ← **NEXT**
**Branch**: `refactor/REFACT-006-remaining-pages` (already checked out)

**What needs doing:**
- Extract inline `<style>` (599 lines total, ~430 lines CSS) → co-located `login.css`
- Left panel currently shows **hardcoded stats** (`20+ Members`, `3 Trainers`) — replace with real DB query
- Create `hooks/usePublicGymStats.ts` — anon-safe query to `members` + `trainers` tables filtered by `gym_id`, returns `{ memberCount, trainerCount }`. Must work pre-auth (check RLS allows anon SELECT on these tables or use a Supabase RPC).
- Left panel stat for "Locations" already uses `settings?.branches?.length` ✅
- Wire `usePublicGymStats(settings?.gym_id)` — `enabled: !!settings?.gym_id`

**Key things to preserve:**
- The `gymSlug` detection `useEffect` (reads `?gym=` param + subdomain)
- The `ROLE_CONFIG` object with dynamic accent colors
- The `Suspense` wrapper (required because of `useSearchParams`)
- `--accent-current` CSS custom property set via inline style for role-based color theming
- Login is fully working — this is a CSS extraction + stats fix only, no logic rewrites

### 2. `feat/FEAT-004-attendance-checkin` (after login)
- Daily check-in flow — new `app/dashboard/attendance/page.tsx`

## 🗂️ Key File Structure (Current)
```
app/
  globals.css                    ← Design tokens, shared UI (DO NOT duplicate here)
  layout.tsx                     ← Has <Toaster /> from react-hot-toast
  dashboard/
    page.tsx                     ← ✅ Refactored (REFACT-004)
    dashboard.css                ← ✅ Co-located styles
    members/
      page.tsx                   ← ✅ Golden UI reference
      members.css                ← Page-specific styles
      MemberDrawer.tsx           ← ✅ Extracted drawer component
      MemberDrawer.css           ← Drawer-specific styles
    payments/
      page.tsx                   ← ✅ Refactored (REFACT-005)
      payments.css               ← ✅ Co-located styles
      PaymentDrawer.tsx          ← ✅ Extracted drawer component
      PaymentDrawer.css          ← Drawer-specific styles
components/
  ui/
    Nav.tsx                      ← ✅ Reusable, self-contained
    Modal.tsx                    ← ✅ Reusable modal wrapper
    Avatar.tsx, StatCard.tsx, etc.
  members/
    AddMemberModal.tsx           ← ✅ 3-step wizard
    RenewMembershipModal.tsx     ← ✅ 3-step wizard
    RecordPaymentModal.tsx       ← ✅ 2-step wizard
hooks/
  useMembers.ts                  ← ✅ TanStack Query
  usePayments.ts                 ← ✅ TanStack Query (REFACT-005)
  useCreateMember.ts             ← ✅ useMutation
  useRenewMembership.ts          ← ✅ useMutation
  useRecordPayment.ts            ← ✅ useMutation
  usePlans.ts                    ← ✅
  useGymSettings.ts              ← ✅
  useDashboardStats.ts           ← ✅ TanStack Query
  useCurrentUser.ts              ← ✅ TanStack Query
lib/
  utils/
    format.ts                    ← formatINR, formatDate, getInitials
    date.ts                      ← todayISO, monthStartISO, sevenDaysFromNow, addDays, todayRangeISO
  constants/
    design.ts                    ← ACCENT, BG, TEXT, BORDER, ACCENT_DIM tokens
    status.ts                    ← STATUS_CONFIG (single source for all status pills)
  members/
    status.ts                    ← getMemberStatus() business logic
    filters.ts                   ← MEMBER_FILTERS, MemberFilterStatus type
  validations/
    member.ts                    ← createMemberSchema (Zod)
types/
  index.ts                       ← All shared TypeScript types
```

## ⚠️ Known Decisions & Conventions

### CSS Strategy
- **Keep co-located `.css` files** — one per page, one per component. This is the convention.
- **No `<style jsx>`** — styled-jsx is not installed. Use plain `<style>` tags or `.css` files.
- **Tailwind**: installed but not yet used. May be introduced for new pages/components after REFACT-004. Do NOT mix Tailwind and vanilla CSS in the same component.

### Date Handling
- **Always use `lib/utils/date.ts`** helpers. Never `new Date().toISOString()` in components — returns UTC and shows wrong date for IST users.

### Error Handling
```ts
// ✅ Always
catch (error: unknown) {
  const msg = error instanceof Error ? error.message : "Something went wrong";
  toast.error(msg);
}
// ❌ Never
catch (error: any) { ... }
```

### Supabase Pattern
```ts
const { data, error } = await supabase.from("table").select("*");
if (error) throw error; // ← always check before accessing data
```

## 🧪 Local Testing
- `npm run dev` (already running)
- Test subdomains: `bodyline.localhost` or `?gym=slug` param
- TypeScript check: `npx tsc --noEmit` (must return 0 errors before any commit)

## 🚩 Pending Production Items
- **`<Toaster />`** in `app/layout.tsx` — verify it's there (added during FEAT-002)
- **Error boundaries**: each page needs `error.tsx` for production stability
- **Loading skeletons**: replace text-only loading screens with CSS skeleton pattern
