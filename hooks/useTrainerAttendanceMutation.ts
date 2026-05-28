"use client";

// ============================================================
// hooks/useTrainerAttendanceMutation.ts
// Clock-in and clock-out mutations for the trainer portal.
//
//   useClockIn()
//     → Inserts a new trainer_attendance row with clock_in = now().
//       Blocked if the trainer already has an open row today
//       (enforced by the unique partial index on the DB).
//
//   useClockOut()
//     → Updates the open trainer_attendance row with clock_out = now().
//
// Both mutations invalidate:
//   - ["trainer-attendance-today", trainerId]
//   - ["trainer-attendance-history", trainerId]
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { ClockInInput, ClockOutInput } from "@/types";

const supabase = createClient();

// ── Clock In ──────────────────────────────────────────────────────────────────

interface ClockInPayload extends ClockInInput {
  trainer_id: string;
  gym_id: string;
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trainer_id, gym_id, notes }: ClockInPayload) => {
      const { error } = await supabase.from("trainer_attendance").insert({
        trainer_id,
        gym_id,
        notes: notes ?? null,
        // clock_in, date, created_at all default to DB values (IST-aware)
      });
      if (error) throw error;
    },
    onSuccess: (_data, { trainer_id }) => {
      void queryClient.invalidateQueries({
        queryKey: ["trainer-attendance-today", trainer_id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["trainer-attendance-history", trainer_id],
      });
      toast.success("Clocked in! Have a great session. 💪");
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Failed to clock in.";
      // Surface a friendly message for the unique constraint violation
      const friendlyMsg = msg.includes("unique")
        ? "You're already clocked in today."
        : msg;
      toast.error(friendlyMsg);
    },
  });
}

// ── Clock Out ─────────────────────────────────────────────────────────────────

interface ClockOutPayload extends ClockOutInput {
  trainer_id: string;
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendance_id, trainer_id, notes }: ClockOutPayload & { trainer_id: string }) => {
      const { error } = await supabase
        .from("trainer_attendance")
        .update({
          clock_out: new Date().toISOString(),
          ...(notes ? { notes } : {}),
        })
        .eq("id", attendance_id)
        .eq("trainer_id", trainer_id); // Safety: trainer can only close their own row

      if (error) throw error;
    },
    onSuccess: (_data, { trainer_id }) => {
      void queryClient.invalidateQueries({
        queryKey: ["trainer-attendance-today", trainer_id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["trainer-attendance-history", trainer_id],
      });
      toast.success("Clocked out. See you tomorrow!");
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Failed to clock out.";
      toast.error(msg);
    },
  });
}
