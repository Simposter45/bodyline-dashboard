"use client";

// ============================================================
// hooks/useBookingMutations.ts
// Mutations for updating member PT bookings.
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/types";
import toast from "react-hot-toast";

export function useBookingMutations() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      // RLS policy bookings_trainer_update ensures trainers can only
      // update bookings where trainer_id matches their own trainer record.
      // No need to filter by trainer_id here — that would require fetching
      // the trainer's row UUID which differs from auth.uid().
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries for both member and trainer views
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-bookings"] });
      
      const statusMessage = variables.status === "confirmed" ? "Session confirmed" : "Session cancelled";
      toast.success(statusMessage, { icon: "✅" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update session");
    },
  });

  return { updateStatus };
}
