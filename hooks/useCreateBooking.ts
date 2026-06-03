"use client";

// ============================================================
// hooks/useCreateBooking.ts
// TanStack mutation for members to request a PT session slot
// with their assigned trainer.
//
// Inserts into the bookings table with status = "pending".
// The trainer will then confirm or cancel via their portal.
//
// Invalidates: ["bookings", memberId] on success so the
// SessionsTab immediately reflects the new request.
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ── Payload ───────────────────────────────────────────────────────────

export interface CreateBookingPayload {
  memberId: string;
  gymId: string;
  trainerId: string;
  /** ISO date string (YYYY-MM-DD) — must be tomorrow or later */
  sessionDate: string;
  /** Time string in HH:MM format — e.g. "07:00" */
  sessionTime: string;
  notes?: string;
}

// ── Mutation ─────────────────────────────────────────────────────────

/**
 * Creates a PT session booking request for the member.
 * Status defaults to "pending" — trainer confirms from their portal.
 *
 * On success: invalidates ["bookings", memberId] so the sessions
 * list re-fetches and shows the new pending request immediately.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const supabase = createClient();

      const { error } = await supabase.from("bookings").insert({
        gym_id: payload.gymId,
        member_id: payload.memberId,
        trainer_id: payload.trainerId,
        session_date: payload.sessionDate,
        session_time: payload.sessionTime,
        status: "pending",
        notes: payload.notes ?? null,
      });

      if (error) throw error;

      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookings", variables.memberId],
      });
    },
  });
}
