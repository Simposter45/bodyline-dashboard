# SaaS Platform Context & Handoff Tracker

This document is the absolute **single source of truth** for the multi-tenant SaaS dashboard, summarizing the platform history, architectural foundations, past milestones, and upcoming roadmap items.

---

## 🎯 Current Focus & Active Objective

* **SaaS Migration Status**: **MIGRATION COMPLETE & MERGED TO `main`** ✅
* **Current Focus**: **FEAT-009 — Member Portal Rebuild** (Branch: `feat/FEAT-009-member-portal-rebuild`)
  * **Objective**: Rebuild the 1,316-line bespoke member portal monolith into a modern, hook-driven (TanStack Query), mobile-first component structure with co-located CSS.
  * **Key additions**: Add self-service membership renewal requests, dynamic membership expiry alert banners, and a full personal attendance history log.

---

## 🏗️ Architectural Core

* **Framework**: Next.js 16.2.1 (App Router) + Supabase SSR. (Pages Router is forbidden).
* **Multi-Tenancy Resolution**:
  * Scoped via the `gym_id` column present across all 8 tables.
  * Resolved at the request level via Next.js middleware using subdomain headers.
  * Local Dev: resolves subdomains like `[slug].localhost` or falls back to the `?gym=slug` query parameter bypass.
* **Security & Row Level Security (RLS)**:
  * PostgreSQL RLS is active, verified, and hardened across all tables.
  * Tenant boundaries are enforced via `current_gym_id()` which extracts the middleware-injected tenant context.
  * Direct client-side gym-filtering is prohibited; all scoping must go through authenticated, RLS-enforced database queries.
* **Data Fetching**: TanStack Query v5 is the project standard. Raw client-side `useEffect` data fetching is prohibited. Custom hooks live in `hooks/`.
* **State & Styling**:
  * Vanilla CSS with co-located `.css` files (one per page/component).
  * Design tokens and shared classes are located in `app/globals.css` (always check globally before writing custom classes).
  * Tailwind CSS is supported for new layouts but must not be mixed with vanilla CSS in the same file.
* **Forms & Validations**: React Hook Form + Zod resolvers. Validation schemas live in `lib/validations/<entity>.ts`.

---

## 🗄️ Database & RLS Infrastructure

### Multi-Tenant Helper Functions
The tenant identifier is automatically resolved in middleware and injected into the database session context. The following PostgreSQL RLS helper is the source of truth for all query policies:
```sql
CREATE OR REPLACE FUNCTION current_gym_id()
RETURNS UUID AS $$
  SELECT current_setting('request.gym_id', true)::UUID;
$$ LANGUAGE sql STABLE;
```

### Audited Tenant Tables (100% Isolated)
1. `gyms` (Tenant metadata, branch lists)
2. `gym_settings` (Branding, primary colors, support contacts)
3. `members` (Gym members data, scoped via `gym_id`)
4. `member_memberships` (Membership history)
5. `trainers` (Trainers directory)
6. `trainer_assignments` (Trainer-member rosters)
7. `attendance` (Check-in/check-out logs, role-guarded `att_gym_isolation` policies with CHECK constraint)
8. `payments` (Payment ledger)

---

## ✅ Completed Milestones (Merged to `main`)

### 1. Multi-Tenancy & Dynamic Branding (`CHORE-006`)
* Seeded a second sandbox tenant ("Iron Temple") alongside the default ("Bodyline Fitness").
* Hardened anonymous policies for secure onboarding read/insert operations.
* Implemented dynamic branding skinning that maps colors and components directly to the gym's custom `primary_color` (e.g. Bodyline = Green, Iron Temple = Blue).

### 2. Client-Side Pagination (`FEAT-006`)
* Standardized 25-row client-side pagination implemented across the **Members**, **Payments**, and **Attendance** pages.
* Integrated with active filters, search queries, and sort matrices, resetting dynamically to page 1 on search or filter updates.

### 3. Mobile Responsiveness & Bottom Navigation (`REFACT-008`)
* Developed a 5-tab fixed bottom navigation bar for the owner role at `≤640px` (Dashboard, Members, Payments, Attendance, Trainers).
* Replaced standard tables with responsive table card stacks (`className="responsive-table"`).
* Swapped desktop filters with sliding bottom filter sheets.
* Implemented FABs (floating action buttons) for quick additions on mobile.

### 4. Modular Trainers Page (`REFACT-007`)
* Refactored the pre-modularization 861-line monolith to under 210 lines.
* Extracted styling to co-located `trainers.css` and migrated data layers to TanStack Query (`useTrainers.ts`).
* Integrated the unified `<Nav role="owner" />` component.

### 5. Historical Attendance & IST Date Bounds (`FEAT-004` & `FEAT-004b`)
* Built live check-in/check-out mutations and an IST-aware historical search page (Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range).
* Resolved IST day offset issues (`BUG-002` & `BUG-003`) by shifting date boundaries from UTC midnight to local IST (UTC+5:30) date boundaries.

### 6. Error Boundaries (`CHORE-005`)
* Integrated Route-level crash catcher screens using a shared `ErrorFallback` UI wrapper.

---

## 🔜 Next Tasks (Priority Order)

| Priority | ID | Task | Branch | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **High** | `FEAT-009` | **Member Portal Rebuild** | `feat/FEAT-009-member-portal-rebuild` | Monolith extraction (1,316 lines), TanStack Query hooks, co-located styles, self-service renewals |
| 🔴 **High** | `FEAT-010` | **Trainer Portal Rebuild** | `feat/FEAT-010-trainer-portal-rebuild` | Monolith extraction (1,196 lines), assigned check-in views, notes, assigned members dues tracking, and Trainer-Led Payment Collection (log cash/UPI payments directly for roster members) |
| 🔴 **High** | `FEAT-014` | **Membership Plan Manager** | `feat/FEAT-014-membership-plan-manager` | [NEW] Dashboard controls for managing gym membership plans (create, edit, delete plans) and assigning, pausing, or canceling subscriptions per member |
| 🔴 **High** | `FEAT-007` | **Trainer Action Modals** | `feat/FEAT-007-trainer-actions` | `AddTrainerModal`, `AssignMemberModal`, `EditTrainerModal` (Modals TBD, buttons already wired) |
| 🟡 **Medium** | `FEAT-011` | **QR Code Check-In** | `feat/FEAT-011-qr-attendance` | [ELEVATED] Lowest-cost, highest-performance check-in. Unique dynamic member QR codes scanned by a desk webcam/tablet to log attendance instantly |
| 🟡 **Medium** | `CHORE-004` | **Branch-Level Attendance** | `feat/CHORE-004-branch-attendance` | Schema change: Add `branch` column to `attendance` table for location validation |
| 🔵 **Low** | `CHORE-001` | **Atomic Member Creation** | — | Refactor 2-step insert (members → memberships) to use an atomic Supabase RPC |
| 🔵 **Low** | `CHORE-002b` | **Auto Status Transition** | — | Database batch job (pg_cron) to auto-transition expired rows from pending to overdue |
| 🔵 **Low** | `CHORE-003` | **Dynamic Timezones** | — | Resolve timezone offsets dynamically from `gym_settings.timezone` |
| 🔵 **Low** | `FEAT-008` | **Loading Skeletons** | — | CSS skeleton shimmers to replace basic "Loading..." texts |
| ⬛ **Backlog** | `FEAT-012` | **WhatsApp Notifications** | — | Expiry and registration notifications via Twilio/WATI (stubs are already wired in JSX) |
| ⬛ **Backlog** | `FEAT-013` | **Recharts Reports Dashboard** | — | Graphical statistics, revenue charts, and attendance heatmaps |

---

## 🗂️ Key Directory Architecture

```
app/
  globals.css                    ← Design system tokens & global class overrides (check first!)
  layout.tsx                     ← Root template (<Toaster /> from react-hot-toast)
  login/
    page.tsx                     ✅ Modular login page
    login.css                    ← Co-located login CSS
  dashboard/
    page.tsx                     ✅ Clean, hook-driven home dashboard (check-ins capped at 5)
    dashboard.css
    attendance/
      page.tsx                   ✅ Param-driven historical view, pagination, CSV exports
      attendance.css
    members/
      page.tsx                   ✅ "Golden UI" Reference (design and spacing truth)
      members.css
      MemberDrawer.tsx           ✅ Shared panel reused in Attendance and Members
      MemberDrawer.css
    payments/
      page.tsx                   ✅ Modular Payments Page (1419 → 255 lines)
      payments.css
      PaymentDrawer.tsx          ← Co-located Payment details sheet
      PaymentDrawer.css
    trainers/
      page.tsx                   ✅ Hook-driven Trainers panel (Nav integrated, no useEffects)
      trainers.css
      TrainerDrawer.tsx          ← Mobile layout tab-switch sheet
      TrainerDrawer.css
  onboarding/
    page.tsx                     ✅ Modular Gym Owner registration form
    onboarding.css
components/
  ui/
    Nav.tsx                      ← Dynamic navigation bar (owner role scrollable bottom bar)
    Modal.tsx, Avatar.tsx, StatCard.tsx, StatusPill.tsx, Panel.tsx
  members/
    AddMemberModal.tsx           ← 3-step wizard form (Zod validation)
    RenewMembershipModal.tsx     ← Renewal submission modal
    RecordPaymentModal.tsx       ← Payment logging modal
hooks/
  useMembers.ts                  ← Members query fetch hook
  useMember.ts                   ← Single member query fetch hook
  useTrainers.ts                 ← Trainers query hook with Assignment joins
  usePayments.ts                 ← Payment ledger ledger hook
  useAttendance.ts               ← Params-based attendance range hook
  useCheckin.ts                  ← checkIn & checkOut TanStack mutations
  usePublicGymStats.ts           ← Public counts query hook (anonymous safe)
```

---

## ⚠️ Known Gotchas & Historical Warning Logs

### 1. ₹0 Collected Revenue Discrepancy (`BUG-001`)
* **Root Cause**: Plain date comparisons (`monthStartISO()`) against SQL ISO UTC timestamps resulted in wrong date matches for Indian timezone (IST) users.
* **Fix**: Implemented `monthStartISTTimestamp()` which converts IST month-start dates to their exact UTC counterparts for database timestamp comparison.

### 2. Early Morning Attendance Misses (`BUG-002` & `BUG-003`)
* **Root Cause**: UTC midnight date boundary queries missed check-ins logged between 00:00 AM and 05:30 AM IST (the timezone offset delta).
* **Fix**: Deprecated `todayRangeISO()` completely. Switched queries to use `todayRangeIST()` which uses `toISTDateString()` on the server side to properly query within local Indian Standard Time boundaries.

---

## ⚠️ Coding Conventions & Guidelines (AGENTS.md §9)

1. **Strict Types Only**: No `any` types. Catch statements must narrow the error explicitly:
   ```typescript
   catch (error: unknown) {
     const msg = error instanceof Error ? error.message : "Something went wrong";
     toast.error(msg);
   }
   ```
2. **CSS Separation**: Write co-located `.css` files for pages and components. Refrain from mixing inline `<style>` blocks or Tailwind classes with traditional CSS in a single component.
3. **Vanilla CSS Standard**: Always check `globals.css` before writing new visual selectors (utilize `.toolbar`, `.filter-tabs`, `.table-wrap`, `.btn-solid` classes).
4. **No Raw Dates**: Always use the IST-safe Date helpers in `lib/utils/date.ts`. Never use raw `new Date().toISOString()`.
5. **Supabase Handling**: Check for errors immediately on Supabase returns before accessing properties:
   ```typescript
   const { data, error } = await supabase.from("table").select("*");
   if (error) throw error;
   ```

---

## 🧪 Local Deployment & Verification

* **Launch Dev Server**: `npm run dev` (Runs locally on `localhost:3000`)
* **Subdomain Emulation**: Use `bodyline.localhost:3000` or attach query params `?gym=bodyline` or `?gym=iron-temple` to bypass subdomain routing locally.
* **Types Check**: Proactively run `npx tsc --noEmit` to verify type safety before proposing commits.

---

## 📱 Mobile-First Styling & Unified UI/UX Standards

Starting with all new features, we enforce a strict **Mobile-First Responsive design** standard. Instead of separate parallel codebases, we maintain a single, highly-adaptive codebase:
* **Tailwind & Vanilla Media Queries**: Layouts must dynamically transform based on screen widths (e.g. desktop side-by-side tables become swipable, touch-friendly card decks on screens `≤640px`).
* **Mobile Drawer Standard**: In desktop views, side panels or modals are acceptable, but on mobile, these **must** resolve as bottom drawer sheets (`MemberDrawer` and `PaymentDrawer` style).
* **High Touch-Target Design**: All interactive items, buttons, input fields, and status toggles must have a minimum interactive height/width of `44px` for easy tap actions on mobile screens.

---

## 🇮🇳 Special Indian Gym Operational Features & Strategic Blueprint

### 1. Trainer Financial & Roster Accountability
In Indian gyms, trainers act as direct relationship managers for their member roster:
* **Assigned Member Dues Tracking**: Trainers can check their assigned members' pending dues directly inside the rebuilt Trainer Portal (`FEAT-010`).
* **Trainer-Led Payment Collection**: Enables trainers on the floor to collect payments (Cash/UPI) directly from members and record them in the system. The collected payment is marked with a reference tag `recorded_by_trainer_id` for owner reconciliation.

### 2. QR Code Attendance Strategy (Lowest Cost, Highest Performance)
With zero physical gate lock or biometric systems set up, we adopt a software-based dynamic QR Code system as the ultimate low-cost, high-performance solution:
* **No Hardware Overhead**: Avoids expensive biometric devices or integration protocols.
* **Member Digital ID**: The rebuilt Member Portal (`FEAT-009`) will generate a dynamic, time-limited secure QR code representing the member's unique UUID.
* **Desk Scanner Interface**: A simple webcam or dedicated cheap tablet interface scanning desk-side. When scanned, a database transaction checks for active/overdue membership status, logs the check-in time in IST, and visually signals check-in success/failure to the desk operator.

### 3. Owner Membership & Plans Manager
Rather than static plan types, owners need standard administrative controls to manage all membership packages:
* **Plans Dashboard**: Add controls to configure gym plans (name, price, duration in months, maximum freeze allowance) (`FEAT-014`).
* **Direct Operations**: Give the gym owner full permission to pause subscriptions (for travel or medical reasons), extend active plans, or cancel and void member memberships directly through the Member Drawer.
