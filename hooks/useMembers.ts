"use client";

// ============================================================
// hooks/useMembers.ts
// TanStack Query hook for fetching all members with their
// latest membership and plan. Scoped to the calling user's
// gym automatically via Supabase Row Level Security (RLS).
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Member, MemberMembership, MembershipPlan } from "@/types";

const supabase = createClient();

// Re-exported so page.tsx and any other consumer don't need to
// redefine this — single source of truth for the composed type.
export type MemberWithMembership = Member & {
  membership: (MemberMembership & { plan: MembershipPlan }) | null;
};

// Private to this module — not exported.
async function fetchMembers(): Promise<MemberWithMembership[]> {
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("*")
    .order("joined_date", { ascending: false });

  if (membersError) throw membersError;

  const { data: memberships, error: membershipsError } = await supabase
    .from("member_memberships")
    .select("*, plan:membership_plans(*)")
    .order("created_at", { ascending: false });

  if (membershipsError) throw membershipsError;

  const memberList = (members ?? []) as Member[];
  const membershipList = (memberships ?? []) as (MemberMembership & {
    plan: MembershipPlan;
  })[];

  // Build a map of member_id → latest membership
  // (safe: memberships are ordered by created_at DESC)
  const latestMembership = new Map<
    string,
    MemberMembership & { plan: MembershipPlan }
  >();
  for (const ms of membershipList) {
    if (!latestMembership.has(ms.member_id)) {
      latestMembership.set(ms.member_id, ms);
    }
  }

  return memberList.map((m) => ({
    ...m,
    membership: latestMembership.get(m.id) ?? null,
  }));
}

/**
 * Fetches all members with their latest membership and plan details.
 *
 * Returns standard TanStack Query shape: { data, isLoading, error, refetch }
 * Automatically scoped to the user's gym via RLS — no gym_id needed client-side.
 */
export function useMembers() {
  return useQuery<MemberWithMembership[], Error>({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 30 * 1000,   // Re-fetch in background after 30s
    gcTime:   5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
