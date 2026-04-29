# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
Continue modularising the dashboard pages to match the "Golden UI" standard established in `app/dashboard/members/page.tsx`. The members page, Dashboard cleanup (`REFACT-004`), and Renew/Record Payment modals (`FEAT-003`) are all completed. Next targets are `REFACT-005` (Payments Cleanup) or `FEAT-004` (Attendance Check-in).

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

5. **Renew & Record Payment Modals** — `feat/FEAT-003-renew-and-record-payment`
   - Added validation schemas with `.max()` balance enforcement.
   - `useRenewMembership` and `useRecordPayment` mutation hooks built.
   - Modals fully integrated into `MemberDrawer.tsx` matching Golden UI.

### Last actions
- `feat/FEAT-003-renew-and-record-payment` branch is complete, passed TypeScript checks, and is pushed. Ready for PR.
- CodeRabbit and GitHub PR templates enforce `AGENTS.md` and planning protocols.

## 🔜 Next Tasks (In Priority Order)

### 1. `refactor/REFACT-005-payments-cleanup` ← **START HERE (Option A)**
**Branch**: `git checkout -b refactor/REFACT-005-payments-cleanup`

Same pattern as REFACT-004:
- TanStack Query hook for payments data
- Deduplicate logic using shared `lib/utils/`
- Golden UI loading/error screens
- Co-located `payments.css`

### 2. `feat/FEAT-004-attendance-checkin` ← **START HERE (Option B)**
**Branch**: `git checkout -b feat/FEAT-004-attendance-checkin`

- Daily check-in flow — highest daily-use feature for gym owners
- New page: `app/dashboard/attendance/page.tsx`

### 3. `refactor/REFACT-006-remaining-pages`
- `trainers/page.tsx`, `onboarding/page.tsx`, `login/page.tsx`
- Match Golden UI padding, fonts, loading states

## 🗂️ Key File Structure (Current)
```
app/
  globals.css                    ← Design tokens, shared UI (DO NOT duplicate here)
  layout.tsx                     ← Has <Toaster /> from react-hot-toast
  dashboard/
    page.tsx                     ← 🔴 NEXT TARGET — still monolithic
    members/
      page.tsx                   ← ✅ Golden UI reference
      members.css                ← Page-specific styles
      MemberDrawer.tsx           ← ✅ Extracted drawer component
      MemberDrawer.css           ← Drawer-specific styles
components/
  ui/
    Nav.tsx                      ← ✅ Reusable, self-contained
    Modal.tsx                    ← ✅ Reusable modal wrapper
    Avatar.tsx, StatCard.tsx, etc.
  members/
    AddMemberModal.tsx           ← ✅ 3-step wizard
hooks/
  useMembers.ts                  ← ✅ TanStack Query
  useCreateMember.ts             ← ✅ useMutation
  usePlans.ts                    ← ✅
  useGymSettings.ts              ← ✅
lib/
  utils/
    format.ts                    ← formatINR, formatDate, getInitials
    date.ts                      ← todayISO, sevenDaysFromNow, daysUntil, addDays
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
