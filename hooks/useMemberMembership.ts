"use client";

// ============================================================
// hooks/useMemberMembership.ts
// TanStack Query hook for fetching the member's current
// (latest non-superseded) membership with plan details.
//
// Used by: MembershipCard, RenewalRequestModal, CardTab.
//
// Returns MemberCurrentMembership | null.
//   null → member has no active/pending/overdue membership.
//
// Scoped via RLS — mm_self_read policy gates the query.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MemberCurrentMembership, MemberMembership, MembershipPlan } from "@/types";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchMemberMembership(
  memberId: string,
): Promise<MemberCurrentMembership | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("member_memberships")
    .select("*, plan:membership_plans(id, name, price, duration_days)")
    .eq("member_id", memberId)
    .neq("payment_status", "superseded")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) return null;

  const row = data[0] as MemberMembership & {
    plan: Pick<MembershipPlan, "id" | "name" | "price" | "duration_days"> | null;
  };

  // Plan join can theoretically be null if the plan was deleted
  if (!row.plan) return null;

  return {
    ...row,
    plan: row.plan,
  } as MemberCurrentMembership;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches the member's current (latest non-superseded) membership
 * with plan details. Returns null if no active membership exists.
 *
 * @param memberId  The authenticated member's UUID from useMemberProfile.
 *                  Pass null to hold the query (e.g. while profile is loading).
 *
 * queryKey: ["member-membership", memberId]
 * Stale after 30s — status can change via the nightly cron job.
 */
export function useMemberMembership(memberId: string | null) {
  return useQuery<MemberCurrentMembership | null, Error>({
    queryKey: ["member-membership", memberId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchMemberMembership(memberId!),
    enabled: memberId !== null,
    staleTime: 30 * 1000,
  });
}
