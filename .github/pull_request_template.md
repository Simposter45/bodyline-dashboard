## Type
<!-- Check exactly one. Delete the rest. -->
- [ ] ✨ Feature (`feat/`)
- [ ] ♻️ Refactor (`refactor/`)
- [ ] 🐛 Bug Fix (`fix/`)
- [ ] 🔥 Hotfix (`hotfix/`)
- [ ] 🧹 Chore / Tech Debt (`chore/`)
- [ ] 📄 Docs / Config (`docs/`)

---

## Summary
<!-- One or two sentences. What does this PR do and why? -->


---

## Changes
<!-- List every meaningful change. Group by area: Hooks, Components, Styles, Utils, Fixes, etc. -->
<!-- Delete sections that don't apply. -->

### New Files
-

### Modified Files
-

### Deleted / Consolidated
-

### Bug Fixes
<!-- Only fill in for fix/hotfix types, or if a refactor corrects silent bugs. -->
-

---

## Migration Progress Reference
<!-- Link to the tracker item this closes. -->
- Closes: `MIGRATION_PROGRESS.md` → Phase ___, Item ___
- Branch ticket: `REFACT-___` / `FEAT-___` / `FIX-___` / `CHORE-___`

---

## Screenshots / Recordings
<!-- Attach before/after screenshots or a screen recording for any UI change. -->
<!-- Delete this section for pure backend/logic changes. -->
| Before | After |
|--------|-------|
|        |       |

---

## Testing Checklist
<!-- Tick every box before requesting review. -->
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run dev` — no console errors on affected pages
- [ ] Tested on `bodyline.localhost` (or `?gym=bodyline` param)
- [ ] Golden UI verified — padding, fonts, loading state match `members/page.tsx`
- [ ] RLS verified — data is gym-scoped (no cross-tenant leakage)
- [ ] No hardcoded gym names / IDs / owner-specific strings
- [ ] All `catch` blocks use `error: unknown` pattern (no `any`)
- [ ] No `new Date().toISOString()` — uses `lib/utils/date.ts` helpers
- [ ] No raw `useEffect` data fetching — uses TanStack Query hooks
- [ ] Forms use React Hook Form + Zod (`zodResolver`)

---

## Known Limitations / Follow-ups
<!-- Anything intentionally deferred. Create a CHORE ticket or add to Technical Debt section of MIGRATION_PROGRESS.md. -->
-

---

## Reviewer Notes
<!-- Anything specific you want the reviewer to focus on or be aware of. -->
-
