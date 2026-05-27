"use client";

// ============================================================
// hooks/useTrainerAttendance.ts
// Two query hooks for the trainer's own clock-in/out records:
//
//   useTrainerAttendanceToday(trainerId)
//     → Fetches today's open clock-in row (if any).
//       Used by the Home tab's ClockInCard to show current state.
//
//   useTrainerAttendanceHistory(trainerId, days?)
//     → Fetches the last N days of clock-in/out logs.
//       Used by the Attendance History tab.
//
// Both query keys are invalidated by useTrainerAttendanceMutation.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayRangeIST, lastNDaysRangeIST } from "@/lib/utils/date";
import type { TrainerAttendance } from "@/types";

const supabase = createClient();

// ── Today's open clock-in ─────────────────────────────────────────────────────

async function fetchAttendanceToday(
  trainerId: string,
): Promise<TrainerAttendance | null> {
  const { start, end } = todayRangeIST();

  const { data, error } = await supabase
    .from("trainer_attendance")
    .select("*")
    .eq("trainer_id", trainerId)
    .gte("clock_in", start)
    .lte("clock_in", end)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as TrainerAttendance | null;
}

/**
 * Returns today's trainer_attendance row for the given trainer, or null
 * if they haven't clocked in today.
 *
 * clock_out = null → trainer is currently clocked in.
 * clock_out = timestamp → trainer has clocked out today.
 *
 * @param trainerId - The trainer's own `trainers.id` (from useTrainerSelf)
 */
export function useTrainerAttendanceToday(trainerId: string | undefined) {
  return useQuery<TrainerAttendance | null, Error>({
    queryKey: ["trainer-attendance-today", trainerId],
    queryFn: () => fetchAttendanceToday(trainerId!),
    enabled: !!trainerId,
    staleTime: 60 * 1000,       // Re-check every 60s (clock state can change)
    gcTime: 5 * 60 * 1000,
  });
}

// ── Historical attendance log ─────────────────────────────────────────────────

async function fetchAttendanceHistory(
  trainerId: string,
  days: number,
): Promise<TrainerAttendance[]> {
  const { start, end } = lastNDaysRangeIST(days);

  const { data, error } = await supabase
    .from("trainer_attendance")
    .select("*")
    .eq("trainer_id", trainerId)
    .gte("clock_in", start)
    .lte("clock_in", end)
    .order("clock_in", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrainerAttendance[];
}

/**
 * Returns the trainer's clock-in/out history for the last N days (default 30).
 *
 * @param trainerId - The trainer's own `trainers.id` (from useTrainerSelf)
 * @param days - Number of days to look back (default 30)
 */
export function useTrainerAttendanceHistory(
  trainerId: string | undefined,
  days = 30,
) {
  return useQuery<TrainerAttendance[], Error>({
    queryKey: ["trainer-attendance-history", trainerId, days],
    queryFn: () => fetchAttendanceHistory(trainerId!, days),
    enabled: !!trainerId,
    staleTime: 5 * 60 * 1000,  // Historical data is less time-sensitive
    gcTime: 10 * 60 * 1000,
  });
}
