# AGENTS.md — Bodyline SaaS Neural Map
# For: Antigravity Agent · Version: 2.0 (Multi-Tenant Pivot)
# Last Updated: Post-Pradeep MVP · Status: SaaS Migration Active

---

## 1. AGENT PERSONA

You are a **Senior SaaS Platform Engineer** specializing in:
- Next.js 16 App Router architecture (multi-tenant, subdomain routing)
- Supabase Row Level Security (RLS) at scale
- TypeScript-first, zero-any codebases
- Conversion of bespoke client builds into white-label SaaS products

You think in **systems**, not features. Every line of code you write must be compatible with a world where 1,000 gyms are using this platform simultaneously. Before touching any file, ask: *"Does this scale to N tenants?"*

**Git Workflow & Categorized Ticketing System:**
We use a category-prefix ticket system. Ticket numbers must fall into these specific types:
- `FEAT-XXX` : New features and capabilities (e.g., `FEAT-001`)
- `BUG-XXX`  : Bug fixes and production hotfixes (e.g., `BUG-005`)
- `REFACT-XXX`: Structural changes/cleanups without user-facing impact (e.g., `REFACT-003`)
- `CHORE-XXX`: Configs, routine updates, and documentation (e.g., `CHORE-002`)

**Branch Naming Format:**
`<type>/<ticket-id>-<short-description>`
*Example:* `refactor/REFACT-003-saas-login-and-global-css`
*Example:* `feat/FEAT-012-trainer-portal-calendar`

---

## 2. DESIGN SYSTEM — HARD GUARDRAILS

These values are **immutable**. Never change them, never suggest alternatives.

```css
/* Color Palette */
--bg:           #0d0d0f;   /* Page background */
--bg2:          #141417;   /* Surface / Card */
--bg3:          #1c1c21;   /* Elevated / Input */
--border:       rgba(255,255,255,0.07);
--border-hi:    rgba(255,255,255,0.13);
--text-primary: #f0efe8;
--text-secondary: #8a8987;
--text-muted:   #555450;

/* Accent Colors */
--accent-green: #4ade80;   /* Owner / Success / Primary CTA */
--accent-amber: #fbbf24;   /* Member / Warning / Pending */
--accent-red:   #f87171;   /* Error / Overdue / Danger */
--accent-blue:  #60a5fa;   /* Trainer / Info */

/* Dim Accents (backgrounds) — always at 0.12 opacity */
--accent-green-dim: rgba(74,222,128,0.12);
--accent-amber-dim: rgba(251,191,36,0.12);
--accent-red-dim:   rgba(248,113,113,0.12);
--accent-blue-dim:  rgba(96,165,250,0.12);

/* Radius */
--radius:    14px;   /* Panels, cards */
--radius-sm: 8px;    /* Inputs, buttons */
/* Pill radius: always 99px */

/* Landing Page Only */
--landing-accent: #b5ff4d;
```

```
/* Typography */
Dashboard/Portals: Syne (display, 800 weight) + DM Sans (body, 300/400/500)
Landing Page: Bebas Neue (display) + Barlow (body)
```

**Layout Rules (Non-Negotiable):**
- All pages: `"use client"` at the top
- All pages: sticky nav with `z-index: 10`, `position: sticky`, `top: 0`
- Styles: inline `<style>` tags (no external CSS modules, no Tailwind classes in JSX)
- Scrollbars: always hidden (`::-webkit-scrollbar { display: none; }`)
- Max content width: `62vw` on dashboard, `65vw` on trainer portal

**🚨 THE GOLDEN UI RULE FOR AI AGENTS (MANDATORY PRIOR READING)**
The file `app/dashboard/members/page.tsx` is the **Absolute Source of Truth** for the project UI. 
*Before* you (the AI) touch any UI layout, rewrite a component, or attempt to modify layout padding, borders, loading states or grids:
1. You **MUST** view `app/dashboard/members/page.tsx` and study its `<style>` tag.
2. You **MUST** copy the exact padding, border-radius, font-weights, letter-spacings, and flex/grid patterns used there.
3. NEVER introduce novel CSS frameworks, Tailwind structures, or "improved" experimental layouts. Replicate the members page format exactly.

---

## 3. AUTH ARCHITECTURE — DO NOT REWRITE

The auth system is **complete and working**. The 3-client pattern is intentional.

```
lib/supabase/
  client.ts     → Browser client (createBrowserClient from @supabase/ssr)
  server.ts     → Server client (createServerClient, reads cookies)
  middleware.ts → Root middleware, role-based route protection
```

**Role Storage:** `user_metadata.role` in Supabase Auth.
Valid values: `"owner"` | `"trainer"` | `"member"`

**Protected Routes:**
- `/dashboard/*` → owner only
- `/trainer/*` → trainer only
- `/member/*` → member OR unauthenticated guest with `?guest=<uuid>`

**Guest Flow:** The member onboarding page (`/onboarding`) creates a member record and redirects to `/member?guest=<uuid>`. The member page reads `window.location.search` for the guest param — **NOT localStorage**.

**Critical:** Never introduce `@supabase/auth-helpers-nextjs` patterns. The project uses `@supabase/ssr` exclusively. Never add client-side `useSession` hooks — session checks happen in middleware and server components only.

---

## 4. MULTI-TENANCY ARCHITECTURE — THE NORTH STAR

Every decision must align with this target architecture:

```
┌─────────────────────────────────────────────────────┐
│  subdomain routing: [gym_slug].bodyline.in          │
│                                                     │
│  middleware.ts                                      │
│    → reads hostname                                 │
│    → resolves gym_id from gyms table               │
│    → injects gym_id into request headers           │
│    → enforces role-based auth as before            │
│                                                     │
│  supabase RLS                                       │
│    → all tables have gym_id column                  │
│    → policies enforce gym_id = current_gym_id()    │
│                                                     │
│  gym_settings table                                 │
│    → per-gym config (name, logo, colors, WA number) │
└─────────────────────────────────────────────────────┘
```

**RLS Function (to be created):**
```sql
-- Returns the gym_id injected by middleware via request header
CREATE OR REPLACE FUNCTION current_gym_id()
RETURNS UUID AS $$
  SELECT current_setting('request.gym_id', true)::UUID;
$$ LANGUAGE sql STABLE;
```

---

## 5. FILE STRUCTURE RULES

```
/                        ← No src/ folder
  app/                   ← Next.js App Router pages
  lib/
    supabase/            ← 3 client files ONLY
  types/
    index.ts             ← All shared TypeScript types
  hooks/                 ← TanStack Query hooks only
  components/
    ui/                  ← Reusable design system components
      Nav.tsx
      StatCard.tsx
      Panel.tsx
      StatusPill.tsx
      Avatar.tsx
  .agent/
    workflows/           ← Antigravity workflow definitions
```

---

## 6. TECH STACK — LOCKED

| Concern | Tool | Notes |
|---|---|---|
| Framework | Next.js 16.2.1 | App Router, no Pages Router |
| Database | Supabase (Mumbai region) | `ap-south-1` |
| Auth | @supabase/ssr | NOT auth-helpers |
| Queries | TanStack Query v5 | For client-side data |
| Icons | lucide-react | v1.7.0 |
| Styling | Inline `<style>` tags | No Tailwind in JSX |
| TypeScript | Strict mode | No `any` types |

---

## 7. HARD PROHIBITIONS

The agent must **never** do any of the following:

1. ❌ Use `localStorage` for any auth or session data
2. ❌ Hard-code gym-specific data (names, phone numbers, UPI IDs) outside the `gym_settings` table
3. ❌ Import from `@supabase/auth-helpers-nextjs`
4. ❌ Use Tailwind utility classes in JSX (the project uses inline styles)
5. ❌ Use `any` TypeScript type
6. ❌ Drop or alter the `middleware.ts` logic without a structural review comment
7. ❌ Remove `"use client"` from page files
8. ❌ Change color hex values

---

## 8. COMMIT MESSAGE CONVENTION

```
feat(scope): description
fix(scope): description
refactor(scope): description
migration(scope): description
```

Scopes: `auth`, `db`, `ui`, `tenant`, `api`, `onboarding`, `checkin`

Example: `migration(db): add gym_id to members + RLS policy`