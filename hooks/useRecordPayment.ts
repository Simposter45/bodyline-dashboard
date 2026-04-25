"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RecordPaymentFormData } from "@/lib/validations/member";

const supabase = createClient();

export type RecordPaymentPayload = RecordPaymentFormData & {
  membership_id: string; // The specific membership row to update
  current_amount_paid: number;
  plan_price: number;
};

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordPaymentPayload) => {
      // 1. Calculate new totals
      const newTotalPaid = data.current_amount_paid + data.amount_paid;
      const newStatus = newTotalPaid >= data.plan_price ? "paid" : "pending";

      // 2. Update the specific membership record
      const { error } = await supabase
        .from("member_memberships")
        .update({
          amount_paid: newTotalPaid,
          payment_status: newStatus,
          payment_method: data.payment_method, 
        })
        .eq("id", data.membership_id);

      if (error) throw new Error(error.message);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
