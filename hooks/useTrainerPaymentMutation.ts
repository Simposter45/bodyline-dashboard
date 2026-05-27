"use client";

// ============================================================
// hooks/useTrainerPaymentMutation.ts
// Allows a trainer to record a cash/UPI payment on behalf of
// one of their assigned members.
//
// The recorded row is inserted into member_memberships with:
//   - recorded_by_trainer_id = this trainer's ID (enforced by RLS)
//   - payment_status = "paid"
//   - payment_method = the method the trainer collected
//
// The RLS INSERT policy on member_memberships already enforces:
//   1. member_id must be in the trainer's active assignments
//   2. recorded_by_trainer_id must match auth.uid()'s trainer row
//
// On success, invalidates ["payments"] so the owner's payment
// ledger immediately reflects the new entry.
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { PaymentMethod } from "@/types";

const supabase = createClient();

export interface RecordPaymentAsTrainerInput {
  /** The member_memberships row being paid */
  membership_id: string;
  /** The member being paid for (validated against trainer's assignments) */
  member_id: string;
  /** The trainer's own trainers.id — injected by the portal, not user-typed */
  trainer_id: string;
  /** Cash or UPI — the method collected on the floor */
  payment_method: Extract<PaymentMethod, "cash" | "upi">;
  /** Amount confirmed collected by the trainer */
  amount_paid: number;
}

export function useRecordPaymentAsTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membership_id,
      trainer_id,
      payment_method,
      amount_paid,
    }: RecordPaymentAsTrainerInput) => {
      const { error } = await supabase
        .from("member_memberships")
        .update({
          payment_status: "paid",
          payment_method,
          amount_paid,
          recorded_by_trainer_id: trainer_id,
        })
        .eq("id", membership_id);

      if (error) throw error;
    },
    onSuccess: (_data, { trainer_id }) => {
      // Invalidate the owner's payment ledger so the tagged entry shows up
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      // Also refresh the member roster so the dues badge updates
      void queryClient.invalidateQueries({
        queryKey: ["assigned-members", trainer_id],
      });
      toast.success("Payment recorded! Owner will see this in the ledger.");
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Failed to record payment.";
      toast.error(msg);
    },
  });
}
