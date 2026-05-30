# SaaS Platform Context & Handoff Tracker

This document is the absolute **single source of truth** for the multi-tenant SaaS dashboard, summarizing the platform history, architectural foundations, past milestones, and upcoming roadmap items.

---

## 🎯 Current Focus & Active Objective

* **SaaS Migration Status**: **MIGRATION COMPLETE & MERGED TO `main`** ✅
* **Environment Pipeline Setup**: **COMPLETE (Dev → UAT → Prod)** ✅
* **Current Focus**: **Pre-Launch Analytics & Automation** (Before Sprint 3)
  * **Objective**: Sprint 1 and Sprint 2 are 100% complete. The multi-environment deployment pipeline is live and the Dev database schema and seeded data are verified. We are now prioritizing critical pre-launch operational features: Auto Status Expiry (`CHORE-002b`), GST Invoices, Razorpay integration, and Revenue Analytics (`FEAT-013`).

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

### 7. Owner Profile & Gym Settings (`FEAT-015`)
* Built dedicated profile page for owner credentials and avatar uploads.
* Implemented Gym Settings tab for dynamic branding colors, WhatsApp config, and UPI details.

### 8. Membership Plan Manager & Operations (`FEAT-014`)
* Built the Plans tab in Gym Settings for the owner to create, edit, deactivate, and restore membership plans, completely driven by TanStack mutations.
* Added deep subscription operations (Pause, Extend, Cancel, Resume) inside the `MemberDrawer`, updating the DB correctly and reflecting states with warning banners.

---

## 🚀 Strategic Development Trajectory (Sprint Roadmap)

We structure our near-term roadmap into four high-focus Sprints, separating owner dashboard updates from full portal refactors:

### 🔴 SPRINT 1 — Trainer Foundation & Admin Actions (Owner Dashboard)
* **`FEAT-007` — Trainer Action Modals**: **DONE ✅**
  * Built the core modals (`AddTrainerModal`, `AssignMemberModal`, `EditTrainerModal`) and established the bulk-assignment upsert pattern and RLS gym_id injection. Unblocked complete trainer configuration.
* **`FEAT-012a` — Send Reminder Backend**: **DONE ✅**
  * Built a secure Next.js Route Handler for the Meta WhatsApp Cloud API and integrated a TanStack mutation hook into the Payment Drawer for instant reminders.
* **`FEAT-014` — Membership Plan Manager**: **DONE ✅**
  * Implemented admin dashboard controls for managing membership plans (create, edit, soft-delete pricing options).
  * Added direct subscription operations (pausing, resuming, extending, canceling plans) within the `MemberDrawer`.
* **`FEAT-015` — Owner Profile & Settings Page**: **DONE ✅**
  * Built a dedicated profile page for the gym owner to edit personal details, securely manage account credentials, and upload profile avatars.
  * Implemented the "Gym Settings" tab (Branding, primary colors, Gym Logo uploads, WhatsApp/Email Config, Payments/UPI Integration).

---

### 🔴 SPRINT 2 — Trainer Portal Rebuild (`FEAT-010`) : **DONE ✅**
* **Mobile-First Portal Rebuild**:
  * Extracted the 1,196-line Trainer Portal monolith into clean, modular components driven by TanStack Query hooks.
* **Trainer Self Check-In / Attendance**:
  * *Design Pivot:* Removed manual trainer clock-in capabilities from the portal in favor of centralized reception tracking.
* **Session Logging**:
  * Allowed trainers to log workout/PT sessions completed with their assigned members, viewable in a history tab.
* **Assigned-Member Live Check-in View**:
  * Roster-specific views showing real-time member check-ins and outstanding dues to drive direct trainer accountability on the floor.
* **Payment Collection**:
  * Added a Record Payment Drawer for trainers to log Cash/UPI collections on behalf of members.
* **Owner-Side Trainer Management (`FEAT-010k`)**:
  * Gym owners can provision Supabase Auth credentials for trainers, view their 14-day attendance logs (IST-safe), and soft-unassign members from trainers via the upgraded `AssignmentPanel` and `TrainerDrawer`.

---

### 🔴 PRE-LAUNCH FOCUS — Analytics, Automation, & Payments (Immediate Next)
Before tackling the Member Portal, these operational features are required for a production-ready SaaS launch:
* **`FEAT-013` — Revenue Health Graph**: Replace the static card on the Payments page with an interactive Recharts line/bar chart (Revenue ₹ vs. Active Members) over Week, Month, 6 Months, and 1 Year scales.
* **[BLOCKED] Automated WhatsApp Workflows**: *Currently blocked due to Meta template rejection and number ban.* Implement template-based Auto-Expiry Warnings, Payment Receipts, and Birthday Wishes using the existing Meta Cloud API. Include Bulk WhatsApp Reminders for overdue members.
* **Razorpay Payment Integration**: Architecture planning and implementation for tenant-specific Razorpay key management in `gym_settings` and automated webhook resolution to eliminate cash bottlenecks.
* **GST Invoice / Receipt PDF**: Client-side generation (e.g., `jsPDF`) of receipts per payment for Indian market compliance.
* **`CHORE-002b` — Auto Status Transition (CRITICAL)**: Set up a `pg_cron` or Edge Function batch job to automatically transition expired memberships to `overdue` at midnight. (Must be done before Member Portal reads this status).
* **MoM Trend Tracking (Future)**: Add explicit +5% / -5% month-over-month history tracking metrics to both Members and Payments features.
* **Reminder ROI Dashboard (Future)**: Add a section demonstrating the ROI of the automated reminders (e.g., "Revenue recovered due to reminders" / "Members retained after warning").

---

### 🟡 SPRINT 3 — Member Portal Rebuild (`FEAT-009`)
* **Mobile-First Portal Rebuild**: Refactor the 1,316-line bespoke Member Portal monolith into modular, hook-driven components with co-located CSS.
* **Digital Membership Card**: Hero element showing member details, plan expiry, and a dynamic QR code.
* **`FEAT-011` — QR Code Check-In Generation**: Dynamic, time-restricted QR codes in the Member Portal to be scanned at the desk.
* **Self-Service Renewal Request UI**: Interface allowing members to submit renewal requests directly.
* **Personal Attendance History**: IST-safe historical check-in logs for individual members.

---

### 🔵 Ongoing / Non-Blocking Backlog
* **`CHORE-004` — Branch-Level Attendance**: Schema update to add a `branch` column to the `attendance` table for location validation.
* **`CHORE-001` — Atomic Member Creation**: Refactor the 2-step onboarding sequence (insert member → insert membership) into a single, atomic Supabase RPC.
* **`FEAT-008` — Loading Skeletons**: Add custom CSS skeleton shimmer loading screens to replace basic "Loading..." texts.
* **Attendance Heatmap**: Grid-based peak-hour check-in visualizers for managing floor capacity.

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

### 4. Trainer Attendance Tracking
Trainers are accountable staff, not just service providers — their own attendance must be tracked:
* **Clock In / Clock Out**: Trainers mark their own attendance (likely via the Trainer Portal or a dedicated desk panel).
* **Owner Visibility**: The Trainers page on the owner dashboard displays daily/weekly trainer attendance logs alongside member assignment data.
* **Scope**: Part of `FEAT-010` (Trainer Portal Rebuild). Schema may reuse or extend the existing `attendance` table with a `role` discriminator column, or use a separate `trainer_attendance` table — to be decided at implementation time.

---

## 🌍 Product Strategy & Environment Architecture

### Multitenancy via Subdomains
The platform is designed to isolate gym data using `gym_id`. To provide a seamless SaaS experience, we will implement **subdomain routing** (`[gym_slug].bodyline.app`).
* **Requirements**: Add a `slug` column to the `gyms` table.
* **Resolution**: Next.js middleware will read the incoming Vercel wildcard subdomain request, lookup the `gym_slug`, resolve the `gym_id`, and inject it into the session context.
* **Status**: **PENDING** (Highest priority architectural task before onboarding gym #2).

### Deployment Pipeline (Dev → UAT → Prod) ✅ LIVE

The 3-tier Git/Vercel pipeline is fully operational with a **GitFlow-Lite** release model:

| Layer | Branch | URL | Supabase Project | Purpose |
|---|---|---|---|---|
| **Local Dev** | `feat/*`, `bug/*`, `chore/*` | `localhost:3000` | Dev (`qkgxvbvecjgzykvyzrek`) | Write & test code |
| **UAT** | `develop` | `bodyline-uat.vercel.app` | Dev (same) | Validate before prod |
| **Production** | `main` | `bodyline-dashboard.vercel.app` | Prod (`zhdnbrvrmjcxjlfhqlwt`) | Live demo / client |

**Day-to-day workflow:**
```
feat/* → merge to develop → auto-deploy UAT → verify → release queue
```

**Production release (2× per week, batch):**
```
develop (UAT verified) → prod-deploy/YYYY-MM-DD → merge to main → tag release/YYYY-MM-DD
```
- `prod-deploy/*` branches are the **controlled release gate** — they bundle one or more UAT-approved features into a single production shipment.
- Every `main` merge is **tagged** (`release/YYYY-MM-DD`) for rollback traceability.
- Release decisions (what ships and when) are made by the product owner.

**Dev DB Schema Setup:** Run `scripts/00_fresh_schema.sql` on a fresh Supabase project to create all tables + RLS from scratch.  
**Dev DB Seed:** Run `npx tsx scripts/seed-dev.ts` to populate with distinct fake data (FitPeak Pune + Iron Temple Mumbai).

**Dev credentials (UAT / Local only — never use on Prod):**
- `owner@fitpeak.dev` / `Fitpeak@123` (FitPeak owner — slug: `bodyline`)
- `owner@irontemple.dev` / `Iron@123456` (Iron Temple owner — slug: `iron-temple`)
- `trainer1@fitpeak.dev` / `Fitpeak@123`
- `trainer1@irontemple.dev` / `Iron@123456`

### Current Demo State
The production database (`bodyline-dashboard.vercel.app`) contains seeded/demo data and is used as the **permanent demo environment** for live, in-person sales pitches. The Dev/Prod infrastructure split is now complete.

---

## 🚧 Open / Deferred Decisions (Payments Page)

The following items from the Payments page were raised and need resolution before the next agent picks them up:

### 1. Mark as Paid vs. Record Payment
* **Resolution**: The redundant "Mark as Paid" button was completely removed in `FEAT-012a` to enforce a single code path through the `RecordPaymentModal`.

### 2. Send Reminder — Channel & Provider
* **Resolution**: Integrated directly with the Meta WhatsApp Cloud API (`FEAT-012a`) using utility templates. WATI/Twilio were skipped in favor of direct, zero-markup Meta integration.

### 3. Revenue Health Card → Revenue Graph
* **Current state**: The Revenue Health card on the Payments page is a static UI element with no real data behind it.
* **Agreed direction**: Replace it with an interactive Recharts dual-axis graph (Revenue ₹ vs. Member count) across time scales.
* **Resolution**: Promoted to Immediate Next in the Pre-Launch Focus (`FEAT-013`).
