"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Gym } from "@/types";

const supabase = createClient();

/**
 * Hook to fetch the current gym record from the `gyms` table.
 * Automatically scopes to the gym indicated in the user's JWT metadata.
 */
export function useGym() {
  return useQuery({
    queryKey: ["current-gym"],
    queryFn: async () => {
      // Get current user & gym_id from metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const gymId = user?.app_metadata?.gym_id;

      if (!gymId) return null;

      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", gymId)
        .single();

      if (error) throw error;

      return data as Gym;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
