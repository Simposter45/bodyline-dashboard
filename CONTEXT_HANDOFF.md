# SaaS Migration Handoff: Production Readiness & Modularity

## 🎯 Current Objective
Move from page to page to ensure every module is production-ready, strictly modular, and follows the "Golden UI" standard established in `members/page.tsx`.

## 🏗️ Architectural Core
- **Framework**: Next.js 14 (App Router) + Supabase SSR.
- **Tenancy**: Multi-tenant via `gym_id`. Resolution via subdomain middleware.
- **Security**: PostgreSQL RLS (Row Level Security) is ACTIVE and HARDENED. Helper functions `current_gym_id()` and `get_my_role()` are the source of truth.
- **Styling**: Vanilla CSS scoped within `<style>` tags. Global tokens are in `app/globals.css`.

## 📍 Page-by-Page Status (The "Modular Audit" List)
1. **Nav Component**: Extracted, but needs a final check to ensure it doesn't drift from the `members` page hardcoded version.
2. **Dashboard (Main)**: Standardized to 1200px. Redundant styles removed. Greeting synced.
3. **Members Page (The Golden UI)**: It is the source of truth, but ironically it's the **least modular**. Many UI elements (StatusPills, Avatar logic) are inlined and should be replaced by official components to prevent future drift.
4. **Trainers & Payments**: Need an audit to ensure they inherit the global `loading-screen` and `page-header` classes correctly.
5. **Onboarding**: Recently fixed `gym_id` bug, but needs cleanup of inlined styles.

## 🧪 Local Testing Protocol (Offline/Localhost)
- Use `npm run dev`.
- Test subdomains locally by adding `bodyline.localhost` to your hosts file or using the `?gym=slug` parameter.
- Verify RLS by switching roles in `app_metadata` (Owner vs Trainer).

## 🚩 Pending Production Hardening
- **Component Extraction**: Move inlined cards and tables from the `members` portal into the shared component library.
- **Error Boundaries**: Ensure each page has a proper `error.tsx` for production stability.
- **Loading Skeletons**: Replace the full-screen "Loading..." text with the CSS-skeleton pattern used in the dashboard.
