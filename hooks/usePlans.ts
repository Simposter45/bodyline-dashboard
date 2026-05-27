"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPlan } from "@/types";

const supabase = createClient();

/**
 * Fetches active membership plans.
 *
 * @param gymId
 *   - `undefined` (no arg): Relies on RLS for scoping. Use in authenticated
 *     dashboard contexts where the user's JWT carries gym_id.
 *   - `null`: Signals "gym_id not yet resolved". Query is suspended until a
 *     real value arrives. Use in pre-auth pages (e.g. onboarding) while
 *     `useGymSettings` is still loading.
 *   - `string`: Explicit gym_id filter. Bypasses RLS dependency. Use in
 *     pre-auth pages once the gym slug has been resolved to a gym_id.
 */
export function usePlans(gymId?: string | null) {
  return useQuery({
    queryKey: ["plans", gymId ?? "auth"],
    queryFn: async () => {
      let query = supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (gymId) {
        query = query.eq("gym_id", gymId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as MembershipPlan[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    // null = "waiting for gymId" → hold the query.
    // undefined or string → fire immediately.
    enabled: gymId !== null,
  });
}

/**
 * Fetches ALL membership plans (active and inactive).
 * For use in the Plans admin manager.
 */
export function useAllPlans(gymId?: string | null) {
  return useQuery({
    queryKey: ["plans", "all", gymId ?? "auth"],
    queryFn: async () => {
      let query = supabase
        .from("membership_plans")
        .select("*")
        .order("is_active", { ascending: false }) // Active first
        .order("price", { ascending: true });

      if (gymId) {
        query = query.eq("gym_id", gymId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as MembershipPlan[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: gymId !== null,
  });
}
