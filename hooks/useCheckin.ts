"use client";

// ============================================================
// hooks/useCheckin.ts
// Two mutations for the attendance check-in page:
//
//   useCheckIn()  — inserts a new attendance row (member arrives)
//   useCheckOut() — updates check_out on an existing row (member leaves)
//
// Both resolve gym_id from auth session metadata (owner-only
// dashboard route), matching the pattern in useCreateMember.ts.
// Both invalidate ["attendance"] + ["dashboard-stats"] so the
// page list and the main dashboard panel update immediately.
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

// ── Check-In ─────────────────────────────────────────────────────────

export interface CheckInInput {
  memberId: string;
}

/**
 * Records a member's arrival. Inserts a new row into `attendance`
 * with check_in = now (UTC ISO). check_out remains null until
 * useCheckOut is called.
 *
 * Invalidates: ["attendance"], ["dashboard-stats"]
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: CheckInInput) => {
      const supabase = createClient();

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Authentication error.");

      const gymId = user.app_metadata?.gym_id as string | undefined;
      if (!gymId) throw new Error("No gym assigned to this account.");

      const { error } = await supabase.from("attendance").insert({
        gym_id: gymId,
        member_id: memberId,
        check_in: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checked in successfully.");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Check-in failed.";
      toast.error(msg);
    },
  });
}

// ── Check-Out ────────────────────────────────────────────────────────

export interface CheckOutInput {
  attendanceId: string;
}

/**
 * Records a member's departure. Updates check_out = now (UTC ISO)
 * on an existing attendance row identified by its id.
 *
 * Invalidates: ["attendance"], ["dashboard-stats"]
 */
export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendanceId }: CheckOutInput) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", attendanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checked out successfully.");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Check-out failed.";
      toast.error(msg);
    },
  });
}
