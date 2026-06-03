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
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .eq("trainer_id", (await supabase.auth.getUser()).data.user?.id ?? "");

      // Note: we filter by trainer_id as a safety check, but the
      // actual authorization is enforced by the bookings_trainer_update RLS policy.
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
