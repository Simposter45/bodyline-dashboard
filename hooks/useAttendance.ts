"use client";

// ============================================================
// hooks/useAttendance.ts
// TanStack Query hook for fetching attendance records for a
// given UTC date range. Scoped to the calling user's gym via
// RLS — no gym_id needed client-side.
//
// Pass IST-aware ranges from lib/utils/date.ts:
//   todayRangeIST()         → today (use isLive=true for 30s poll)
//   yesterdayRangeIST()     → yesterday
//   lastNDaysRangeIST(7)    → last 7 days
//   lastNDaysRangeIST(30)   → last 30 days
//   { start, end }          → custom range from date inputs
//
// queryKey: ["attendance", start, end] — each range is cached
// independently, so switching ranges is instant on revisit.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceWithMember } from "@/types";

// ── Types ────────────────────────────────────────────────────────────

/** UTC ISO timestamp pair representing a query window. */
export interface AttendanceDateRange {
  start: string;
  end:   string;
}

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchAttendance(
  range: AttendanceDateRange,
): Promise<AttendanceWithMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("attendance")
    .select("*, member:members(id, full_name, phone, profile_photo_url)")
    .gte("check_in", range.start)
    .lte("check_in", range.end)
    .order("check_in", { ascending: false });

  if (error) throw error;

  return (data ?? []) as AttendanceWithMember[];
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches attendance records for the given date range.
 *
 * @param range  UTC start/end produced by a lib/utils/date.ts helper.
 * @param isLive When true, refetches every 30s (use for "today" only).
 *               Defaults to false — historical ranges don't need polling.
 */
export function useAttendance(
  range: AttendanceDateRange,
  isLive = false,
) {
  return useQuery<AttendanceWithMember[], Error>({
    queryKey: ["attendance", range.start, range.end],
    queryFn:  () => fetchAttendance(range),
    staleTime: 15 * 1000,
    refetchInterval: isLive ? 30 * 1000 : false,
  });
}
