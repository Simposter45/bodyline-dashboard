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
 * Returns a date N days from today (or a specific baseDate) as an ISO date string (YYYY-MM-DD).
 * e.g. addDays(30) → "2024-05-23"
 */
export function addDays(days: number, baseDate?: string): string {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the first day of the current calendar month as an ISO date string,
 * computed in IST (UTC+5:30) — NOT UTC.
 *
 * Using new Date() in UTC can give the wrong month for Indian users between
 * midnight IST and 05:30 IST (when UTC is still on the previous day).
 *
 * e.g. (called in May) → "2026-05-01"
 */
export function monthStartISO(): string {
  const now = new Date();
  // Shift to IST by adding 5h30m (19800 seconds)
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year  = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Returns the UTC ISO timestamp that corresponds to midnight IST on the
 * first day of the current calendar month.
 *
 * Use this when filtering Supabase `created_at` timestamps (stored in UTC)
 * against the IST calendar month boundary.
 *
 * e.g. (called in May IST) → "2026-04-30T18:30:00.000Z"
 */
export function monthStartISTTimestamp(): string {
  const monthStr = monthStartISO(); // e.g. "2026-05-01"
  // IST midnight = UTC 18:30 the previous day
  const istMidnight = new Date(`${monthStr}T00:00:00+05:30`);
  return istMidnight.toISOString(); // Converts to UTC automatically
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

/**
 * Returns today's date as a formatted human-readable string in IST.
 * e.g. "Friday, 1 May 2026"
 * Uses timeZone: "Asia/Kolkata" so it's correct near the UTC midnight boundary.
 */
export function todayFormatted(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Returns the current month name in IST.
 * e.g. "May"
 * Uses timeZone: "Asia/Kolkata" so it's correct near the UTC month boundary.
 */
export function currentMonthName(): string {
  return new Date().toLocaleString("en-IN", {
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

