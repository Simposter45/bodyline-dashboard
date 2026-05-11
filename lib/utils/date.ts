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
 *
 * ⚠️ Uses UTC midnight — NOT IST-aware. For attendance queries prefer todayRangeIST().
 */
export function todayRangeISO(): { start: string; end: string } {
  const today = todayISO();
  return {
    start: `${today}T00:00:00.000Z`,
    end:   `${today}T23:59:59.999Z`,
  };
}

/**
 * Returns UTC ISO timestamp strings for the start and end of today in IST
 * (IST midnight → IST 23:59:59, converted to UTC).
 *
 * Fixes BUG-002: todayRangeISO() used UTC midnight, so check-ins between
 * 00:00–05:30 IST were on the previous UTC day and invisible on the page.
 *
 * Use this for all attendance queries. Same pattern as monthStartISTTimestamp().
 *
 * e.g. (called at any time on 2026-05-10 IST) →
 *   { start: "2026-05-09T18:30:00.000Z", end: "2026-05-10T18:29:59.999Z" }
 */
export function todayRangeIST(): { start: string; end: string } {
  const today = toISTDateString(new Date()); // IST-correct YYYY-MM-DD (fixes UTC date drift after midnight IST)
  return {
    start: new Date(`${today}T00:00:00+05:30`).toISOString(),
    end:   new Date(`${today}T23:59:59.999+05:30`).toISOString(),
  };
}

// ── Private IST helper ────────────────────────────────────────────────────────
// Shifts a JS Date to IST and returns its YYYY-MM-DD string.
// Used by the range builders below — NOT exported (use todayISO for today).
function toISTDateString(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const year  = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns UTC ISO timestamps for yesterday's full day in IST
 * (IST 00:00:00 → IST 23:59:59.999, expressed as UTC).
 *
 * e.g. called on 2026-05-10 IST →
 *   { start: "2026-05-08T18:30:00.000Z", end: "2026-05-09T18:29:59.999Z" }
 */
export function yesterdayRangeIST(): { start: string; end: string } {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = toISTDateString(d);
  return {
    start: new Date(`${yesterday}T00:00:00+05:30`).toISOString(),
    end:   new Date(`${yesterday}T23:59:59.999+05:30`).toISOString(),
  };
}

/**
 * Returns UTC ISO timestamps spanning the last N days in IST,
 * from N-1 days ago (IST midnight) through today (IST 23:59:59).
 * "Last 7 days" includes today — 7 calendar days total.
 *
 * e.g. lastNDaysRangeIST(7) called on 2026-05-10 IST →
 *   { start: "2026-05-03T18:30:00.000Z" (May 4 IST),
 *     end:   "2026-05-10T18:29:59.999Z" (May 10 IST) }
 */
export function lastNDaysRangeIST(n: number): { start: string; end: string } {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (n - 1));
  const start = toISTDateString(startDate);
  const today = toISTDateString(new Date());
  return {
    start: new Date(`${start}T00:00:00+05:30`).toISOString(),
    end:   new Date(`${today}T23:59:59.999+05:30`).toISOString(),
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

