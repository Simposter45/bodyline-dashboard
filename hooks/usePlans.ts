"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPlan } from "@/types";

const supabase = createClient();

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as MembershipPlan[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
