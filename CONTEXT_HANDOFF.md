# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
Two open PRs need review and merging, then continue building out the Members page functional features before pivoting to other page refactors.

## 🏗️ Architectural Core
- **Framework**: Next.js 14 (App Router) + Supabase SSR.
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS (Row Level Security) is ACTIVE and HARDENED. Helper functions `current_gym_id()` and `get_my_role()` are the source of truth.
- **Styling**: Vanilla CSS scoped within `<style>` tags. Global tokens are in `app/globals.css`.
- **Data Fetching**: TanStack Query (via custom hooks in `hooks/`) for all database operations.
- **Forms**: `react-hook-form` + `zod` (v4) is the project standard for all write operations.
- **Notifications**: `react-hot-toast` — `<Toaster />` is globally mounted in `app/layout.tsx`.

## 📍 Open PRs (Immediate Priority)

### PR 1: `refact/REFACT-003-members-page-modularity` → `main`
**Status**: Open. CodeRabbit integrated — check review comments and resolve before merging.
**What it does**: Full modularization of `members/page.tsx` (1360+ → ~350 lines).
- Extracted formatting to `lib/utils/format.ts` and `lib/utils/date.ts`
- Extracted status logic to `lib/members/status.ts`, filters to `lib/members/filters.ts`
- Extracted `MemberDrawer` into own component + CSS
- Replaced inline nav with `<Nav />` component
- Data fetching via `hooks/useMembers.ts` (TanStack Query)

### PR 2: `FEAT-002-add-member-logic` → `main`
**Status**: Open. CodeRabbit integrated — check review comments and resolve before merging.
**What it does**: Full "Add Member" 3-step modal feature.
- `components/members/AddMemberModal.tsx` — 3-step wizard (Details → Payment → Success)
- `components/ui/Modal.tsx` — reusable modal component (`min(500px, calc(100vw - 48px))` max-width)
- `hooks/useCreateMember.ts` — TanStack `useMutation`, inserts `members` + `member_memberships`
- `hooks/usePlans.ts` — TanStack `useQuery` for active membership plans
- `lib/validations/member.ts` — Zod v4 schema with strict phone regex `/^[6-9]\d{9}$/`
- `lib/utils/date.ts` — `addDays(n)` utility added

## 🔜 Next Features (Members Page Vertical Slice)

### FEAT-003: Renew Membership
- Location: `MemberDrawer.tsx` (action inside drawer for existing members)
- Hook: `useRenewMembership.ts` — TanStack `useMutation`, inserts new row into `member_memberships`
- Key: Must invalidate `["members"]` query on success
- Pattern: Same Zod + RHF + Modal pattern established in FEAT-002

### FEAT-004: Record Payment
- For members with `payment_status: "pending"` or `"overdue"`
- Updates existing `member_memberships` row: sets `payment_status → "paid"`, records `payment_method`
- Hook: `useRecordPayment.ts`
- Pattern: Same Zod + RHF + Modal pattern established in FEAT-002

### CHORE-001: Atomic DB Transaction (Technical Debt)
- `useCreateMember.ts` currently does two sequential inserts (members → member_memberships)
- If second insert fails, an orphaned member is created
- Fix: Create a Supabase RPC function (PostgreSQL transaction) and call it from the hook

## 🧩 After Members Vertical Slice: Refactor Queue
Once Add Member, Renew, and Record Payment are all done:
1. `REFACT-004-dashboard-cleanup` — Strip inline CSS, dedupe formatINR/formatDate/getInitials, TanStack hooks
2. `REFACT-005-payments-cleanup` — Same modularization pattern
3. `REFACT-006` — trainers, onboarding, login pages alignment

## 🧪 Local Testing Protocol
- Use `npm run dev` (already running).
- Test subdomains locally via `?gym=bodyline` param or hosts file entry.
- Verify RLS by switching roles in `app_metadata` (Owner vs Trainer).
- Always run `npx tsc --noEmit` before committing. Must return exit code 0.

## 🚩 Production Hardening (Pending)
- **Error Boundaries**: Each route needs a proper `error.tsx`.
- **Loading Skeletons**: Replace "Loading..." text with CSS skeleton pattern.

## 📦 Installed Dependencies (this session)
```json
"react-hook-form": "^7.73.1",
"@hookform/resolvers": "^5.2.2",
"zod": "^4.3.6",
"react-hot-toast": "^2.6.0"
```

## ⚠️ Agent Rules (from AGENTS.md)
- ALL new branches must follow prefix strategy: `FEAT-XXX`, `REFACT-XXX`, `BUG-XXX`, `CHORE-XXX`
- NEVER modify `app/globals.css` design tokens without explicit user approval
- ALL new pages/components MUST match the padding and grid of `app/dashboard/members/page.tsx`
- Run `tsc --noEmit` before every commit
