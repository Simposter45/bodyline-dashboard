"use client";

// ============================================================
// hooks/useMember.ts
// TanStack Query hook for fetching a single member with their
// latest membership and plan. Used by the attendance page to
// populate MemberDrawer when a log row is clicked.
//
// Returns the same MemberWithMembership shape as useMembers so
// MemberDrawer can be reused without modification.
// Scoped to the calling user's gym via RLS — no gym_id needed.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Member, MemberMembership, MembershipPlan } from "@/types";
import type { MemberWithMembership } from "@/hooks/useMembers";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchMember(id: string): Promise<MemberWithMembership> {
  const supabase = createClient();

  // 1. Fetch the member row
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  if (memberError) throw memberError;

  // 2. Fetch their latest non-superseded membership + plan
  const { data: memberships, error: msError } = await supabase
    .from("member_memberships")
    .select("*, plan:membership_plans(*)")
    .eq("member_id", id)
    .neq("payment_status", "superseded")
    .order("created_at", { ascending: false })
    .limit(1);

  if (msError) throw msError;

  const latestMembership =
    (memberships?.[0] as (MemberMembership & { plan: MembershipPlan }) | undefined) ??
    null;

  return {
    ...(member as Member),
    membership: latestMembership,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches a single member with their latest (non-superseded) membership
 * and plan details. Mirrors the MemberWithMembership shape from useMembers.
 *
 * Pass id=null to hold the query (e.g. when no attendance row is selected).
 * The query is enabled only when id is a non-null string.
 *
 * queryKey: ["member", id] — each member is cached independently.
 */
export function useMember(id: string | null) {
  return useQuery<MemberWithMembership, Error>({
    queryKey: ["member", id],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchMember(id!),
    enabled: id !== null,
    staleTime: 30 * 1000, // Consider stale after 30s, matching useMembers
  });
}
