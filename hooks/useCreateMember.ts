"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/utils/date";
import type { CreateMemberFormData } from "@/lib/validations/member";

const supabase = createClient();

export type CreateMemberPayload = CreateMemberFormData & {
  plan_price: number;
  plan_duration: number;
};

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemberPayload) => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Authentication error.");

      const gymId = user.app_metadata?.gym_id;
      if (!gymId) throw new Error("No gym assigned.");

      const joinedDate = new Date().toISOString().split("T")[0];

      // 1. Insert Member
      const { data: newMember, error: memberErr } = await supabase
        .from("members")
        .insert({
          gym_id: gymId,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          date_of_birth: data.date_of_birth,
          branch: data.branch,
          joined_date: joinedDate,
          is_active: true,
        })
        .select("id")
        .single();

      if (memberErr) throw new Error(memberErr.message);

      // 2. Insert Membership
      const isUpiPaid = data.payment_method === "upi";
      const { error: mmErr } = await supabase
        .from("member_memberships")
        .insert({
          gym_id: gymId,
          member_id: newMember.id,
          plan_id: data.plan_id,
          start_date: joinedDate,
          end_date: addDays(data.plan_duration),
          amount_paid: isUpiPaid ? data.plan_price : 0,
          payment_status: isUpiPaid ? "paid" : "pending",
          payment_method: data.payment_method || "cash",
        });

      if (mmErr) {
        // Warning: orphaned member created if mm fails... In a prod real app, do RPC transaction.
        console.warn("Failed to create membership record:", mmErr);
        throw new Error(mmErr.message);
      }

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

