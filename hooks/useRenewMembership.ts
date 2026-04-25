"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { addDays, todayISO } from "@/lib/utils/date";
import type { RenewMembershipFormData } from "@/lib/validations/member";

const supabase = createClient();

export type RenewMembershipPayload = RenewMembershipFormData & {
  member_id: string;
  plan_price: number;
  plan_duration: number;
};

export function useRenewMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RenewMembershipPayload) => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Authentication error.");

      const gymId = user.app_metadata?.gym_id;
      if (!gymId) throw new Error("No gym assigned.");

      // 1. Calculate new start date based on the latest active membership
      const { data: latestMemberships, error: latestErr } = await supabase
        .from("member_memberships")
        .select("end_date")
        .eq("member_id", data.member_id)
        .in("payment_status", ["paid", "pending"])
        .order("end_date", { ascending: false })
        .limit(1);

      if (latestErr) throw new Error("Failed to fetch existing memberships.");

      let newStartDate = todayISO();
      if (latestMemberships && latestMemberships.length > 0) {
        const latestEndDate = latestMemberships[0].end_date;
        // If the latest membership is still active today or in the future
        if (latestEndDate >= todayISO()) {
          newStartDate = addDays(1, latestEndDate);
        }
      }

      // 2. Insert new Membership
      const isUpiPaid = data.payment_method === "upi";
      const { error: mmErr } = await supabase
        .from("member_memberships")
        .insert({
          gym_id: gymId,
          member_id: data.member_id,
          plan_id: data.plan_id,
          start_date: newStartDate,
          end_date: addDays(data.plan_duration, newStartDate),
          amount_paid: isUpiPaid ? data.plan_price : 0,
          payment_status: isUpiPaid ? "paid" : "pending",
          payment_method: data.payment_method,
        });

      if (mmErr) throw new Error(mmErr.message);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
