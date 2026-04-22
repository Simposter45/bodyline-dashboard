// ============================================================
// lib/utils/date.ts
// Pure date utilities — no React, no Supabase deps.
// Safe to import in any page, component, or hook.
// ============================================================

/**
 * Returns today's date as an ISO date string (YYYY-MM-DD).
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns the date 7 days from now as an ISO date string (YYYY-MM-DD).
 */
export function sevenDaysFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the number of whole days until a given ISO date string.
 * Negative values mean the date has already passed.
 * e.g. daysUntil("2024-12-31") → 14
 */
export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Returns a date N days from today as an ISO date string (YYYY-MM-DD).
 * e.g. addDays(30) → "2024-05-23"
 */
export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
