"use client";

// ============================================================
// hooks/useAttendance.ts
// TanStack Query hook for today's attendance records.
// Scoped to the calling user's gym via RLS — no gym_id needed
// client-side. Refreshes automatically every 30s so the live
// "in gym" count stays current without a manual reload.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceWithMember } from "@/types";
import { todayISO, todayRangeISO } from "@/lib/utils/date";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchTodayAttendance(): Promise<AttendanceWithMember[]> {
  const supabase = createClient();
  const { start, end } = todayRangeISO();

  const { data, error } = await supabase
    .from("attendance")
    .select("*, member:members(id, full_name, phone, profile_photo_url)")
    .gte("check_in", start)
    .lte("check_in", end)
    .order("check_in", { ascending: false });

  if (error) throw error;

  return (data ?? []) as AttendanceWithMember[];
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches all attendance records for today (midnight → 23:59:59 UTC).
 * Ordered newest-first so the most recent check-in appears at the top.
 *
 * queryKey includes todayISO() so the cache resets at midnight —
 * yesterday's records are never mixed with today's.
 *
 * refetchInterval: 30s — keeps "currently in gym" count live
 * without requiring a manual refresh.
 */
export function useAttendance() {
  return useQuery<AttendanceWithMember[], Error>({
    queryKey: ["attendance", todayISO()],
    queryFn: fetchTodayAttendance,
    staleTime: 15 * 1000,       // consider stale after 15s
    refetchInterval: 30 * 1000, // background refetch every 30s
  });
}
