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

/**
 * Returns the first day of the current calendar month as an ISO date string.
 * e.g. (called in April) → "2026-04-01"
 */
export function monthStartISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Returns ISO timestamp strings for the start and end of today (midnight to 23:59:59).
 * Used to scope attendance queries to a single calendar day.
 * e.g. { start: "2026-04-24T00:00:00.000Z", end: "2026-04-24T23:59:59.999Z" }
 */
export function todayRangeISO(): { start: string; end: string } {
  const today = todayISO();
  return {
    start: `${today}T00:00:00.000Z`,
    end:   `${today}T23:59:59.999Z`,
  };
}
