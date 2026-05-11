"use client";

// ============================================================
// hooks/useTrainers.ts
// TanStack Query hook for fetching all trainers and their
// current member assignments.
//
// Fetches the `trainers` table and the `trainer_assignments`
// table (filtered to is_current = true) with a members join
// in a single parallel Promise.all — matching the original
// page logic but now cached and invalidation-ready.
//
// Automatically scoped to the calling user's gym via RLS.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Trainer, TrainerAssignment, Member } from "@/types";

const supabase = createClient();

// Re-exported so TrainerCard, AssignmentPanel, and page.tsx
// share one source of truth for the enriched trainer shape.
export type TrainerWithAssignments = Trainer & {
  assignments: (TrainerAssignment & { member: Member })[];
};

// Private to this module — not exported.
async function fetchTrainers(): Promise<TrainerWithAssignments[]> {
  const [trainersRes, assignmentsRes] = await Promise.all([
    supabase
      .from("trainers")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("trainer_assignments")
      .select("*, member:members(*)")
      .eq("is_current", true)
      .order("assigned_date", { ascending: false }),
  ]);

  if (trainersRes.error) throw trainersRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const trainers = (trainersRes.data ?? []) as Trainer[];
  const assignments = (assignmentsRes.data ?? []) as (TrainerAssignment & {
    member: Member;
  })[];

  return trainers.map((t) => ({
    ...t,
    assignments: assignments.filter((a) => a.trainer_id === t.id),
  }));
}

/**
 * Fetches all trainers with their currently assigned members.
 *
 * Returns standard TanStack Query shape: { data, isLoading, error, refetch }
 * Automatically scoped to the user's gym via RLS — no gym_id needed client-side.
 *
 * Query key: ["trainers"] — will be invalidated by future useAddTrainer /
 * useAssignMember mutation hooks (FEAT-007).
 */
export function useTrainers() {
  return useQuery<TrainerWithAssignments[], Error>({
    queryKey: ["trainers"],
    queryFn: fetchTrainers,
    staleTime: 60 * 1000,     // Re-fetch in background after 60s
    gcTime:   5 * 60 * 1000,  // Keep in cache for 5 minutes
  });
}
