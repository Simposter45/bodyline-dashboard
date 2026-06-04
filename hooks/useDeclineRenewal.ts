"use client";

// ============================================================
// hooks/useDeclineRenewal.ts
// TanStack mutation to decline (delete) a pending renewal
// request submitted by a member.
//
// Behaviour:
//   Deletes the `member_memberships` row identified by its id,
//   but ONLY if payment_status is "pending" (no money collected).
//   This returns the member to their previous state.
//
//   The hard guard (.eq("payment_status", "pending")) is
//   intentional — prevents accidentally deleting paid rows
//   even if the UI passes the wrong id.
//
// Invalidates: ["dashboard-stats"], ["members"], ["payments"]
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export interface DeclineRenewalInput {
  membershipId: string;
  memberName: string; // for the toast message
}

/**
 * Declines a pending renewal request from a member.
 *
 * Deletes the pending `member_memberships` row. The guard
 * `.eq("payment_status", "pending")` ensures only unpaid
 * rows can ever be removed via this mutation.
 */
export function useDeclineRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId }: DeclineRenewalInput) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("member_memberships")
        .delete()
        .eq("id", membershipId)
        .eq("payment_status", "pending"); // hard safety guard

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Renewal request for ${variables.memberName} declined.`);
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to decline renewal.";
      toast.error(msg);
    },
  });
}
