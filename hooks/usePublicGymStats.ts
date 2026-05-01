"use client";

// ============================================================
// hooks/usePublicGymStats.ts
// Fetches publicly-visible stats for the login page left panel.
// Works PRE-AUTH — uses explicit gym_id filter instead of RLS
// current_gym_id(), since anon users have no JWT claims.
//
// RLS requirement: members + trainers tables must have a policy
// FOR SELECT USING (true) scoped to gym_id, or anon-safe RPC.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PublicGymStats {
  memberCount: number;
  trainerCount: number;
}

async function fetchPublicGymStats(gymId: string): Promise<PublicGymStats> {
  const supabase = createClient();

  const [membersRes, trainersRes] = await Promise.all([
    supabase
      .from("members")
      .select("id")
      .eq("gym_id", gymId)
      .eq("is_active", true),

    supabase
      .from("trainers")
      .select("id")
      .eq("gym_id", gymId)
      .eq("is_active", true),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (trainersRes.error) throw trainersRes.error;

  return {
    memberCount: membersRes.data?.length ?? 0,
    trainerCount: trainersRes.data?.length ?? 0,
  };
}

/**
 * Fetches member and trainer counts for the login page left panel.
 *
 * Three-state gymId pattern (matches usePlans):
 *   undefined / null → query held (enabled: false) — settings still loading
 *   string           → explicit .eq("gym_id") filter — pre-auth safe
 */
export function usePublicGymStats(gymId: string | null | undefined) {
  return useQuery<PublicGymStats, Error>({
    queryKey: ["public-gym-stats", gymId],
    queryFn: () => fetchPublicGymStats(gymId!),
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000, // 5 min — public stats don't change often
    gcTime: 10 * 60 * 1000,
  });
}
