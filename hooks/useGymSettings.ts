"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GymSettings } from "@/types";

const supabase = createClient();

/**
 * Hook to fetch and provide current gym branding and configuration.
 * Automatically scopes to the gym indicated in the user's JWT metadata.
 */
export function useGymSettings(options?: { gymSlug?: string }) {
  return useQuery({
    queryKey: ["gym-settings", options?.gymSlug],
    queryFn: async () => {
      let gymId = null;

      if (options?.gymSlug) {
        // Fetch gym_id by slug first
        const { data: gym, error: gymError } = await supabase
          .from("gyms")
          .select("id")
          .eq("slug", options.gymSlug)
          .single();
        if (gymError) {
          console.warn("Could not fetch gym by slug:", gymError);
          return null;
        }
        gymId = gym?.id;
      } else {
        // Get current user & gym_id from metadata
        const { data: { user } } = await supabase.auth.getUser();
        gymId = user?.app_metadata?.gym_id;
      }

      if (!gymId) return null;

      // 2. Fetch settings for this gym
      const { data, error } = await supabase
        .from("gym_settings")
        .select("*")
        .eq("gym_id", gymId)
        .single();

      if (error) throw error;
      
      const settings = data as GymSettings;
      if (settings && typeof settings.branches === "string") {
        try {
          settings.branches = JSON.parse(settings.branches);
        } catch (e) {
          settings.branches = [];
        }
      }

      return settings;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
