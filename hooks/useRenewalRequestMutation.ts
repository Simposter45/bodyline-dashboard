"use client";

// ============================================================
// hooks/useRenewalRequestMutation.ts
// TanStack mutation for member self-service renewal requests.
//
// Behaviour (pre-Razorpay):
//   Inserts a new member_memberships row with payment_status
//   = "pending". This signals the gym owner to follow up and
//   collect payment. The owner then records the payment via the
//   dashboard, which marks it as "paid".
//
//   Future: this hook will be swapped for a Razorpay checkout
//   redirect once the payment integration is live. The feature
//   flag will be toggled per gym subscription tier.
//
// RLS: mm_self_read only covers SELECT for members. The insert
// is protected by mm_anon_insert (which covers anon/member roles)
// — consistent with the onboarding flow pattern.
//
// Invalidates: ["member-membership", memberId]
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayISO, addDays } from "@/lib/utils/date";

// ── Payload ───────────────────────────────────────────────────────────

export interface RenewalRequestPayload {
  memberId: string;
  gymId: string;
  planId: string;
  /** Duration in days — from the selected MembershipPlan.duration_days */
  planDurationDays: number;
}

// ── Mutation ─────────────────────────────────────────────────────────

/**
 * Submits a renewal request on behalf of the member.
 *
 * Creates a pending member_memberships row for the owner to
 * action. No payment is collected at this stage.
 *
 * On success: invalidates ["member-membership", memberId] so the
 * MembershipCard re-fetches and shows the pending state.
 */
export function useRenewalRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RenewalRequestPayload) => {
      const supabase = createClient();

      const startDate = todayISO();
      const endDate = addDays(payload.planDurationDays, startDate);

      const { error } = await supabase.from("member_memberships").insert({
        gym_id: payload.gymId,
        member_id: payload.memberId,
        plan_id: payload.planId,
        start_date: startDate,
        end_date: endDate,
        amount_paid: 0,
        payment_status: "pending",
        payment_method: null,
      });

      if (error) throw error;

      return true;
    },
    onSuccess: (_data, variables) => {
      // Re-fetch the membership card so it reflects the new pending row
      queryClient.invalidateQueries({
        queryKey: ["member-membership", variables.memberId],
      });
    },
  });
}
