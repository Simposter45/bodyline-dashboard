"use client";

// ============================================================
// hooks/useTrainerAttendanceAdmin.ts
// Owner-side read of a specific trainer's attendance history.
//
// Used inside the owner's TrainerDrawer to display a trainer's
// clock-in/out log without requiring the owner to enter the
// trainer portal.
//
// The "ta_att_owner_read" RLS policy grants SELECT to owners
// on all trainer_attendance rows in their gym.
//
// Query key: ["trainer-attendance-admin", trainerId, days]
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { lastNDaysRangeIST } from "@/lib/utils/date";
import type { TrainerAttendance } from "@/types";

const supabase = createClient();

async function fetchTrainerAttendanceAdmin(
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
 * Owner-side: fetch a specific trainer's attendance log.
 * Used in the owner's TrainerDrawer "Attendance" section.
 *
 * @param trainerId - The target trainer's `trainers.id`
 * @param days - Lookback window in days (default 7 for the drawer summary)
 */
export function useTrainerAttendanceAdmin(
  trainerId: string | undefined,
  days = 7,
) {
  return useQuery<TrainerAttendance[], Error>({
    queryKey: ["trainer-attendance-admin", trainerId, days],
    queryFn: () => fetchTrainerAttendanceAdmin(trainerId!, days),
    enabled: !!trainerId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
