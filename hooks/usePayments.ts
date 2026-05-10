"use client";

// ============================================================
// hooks/usePayments.ts
// TanStack Query hook for fetching all payment records
// (member_memberships joined with member and plan).
//
// NOTE: Unlike useMembers, this returns ALL membership rows —
// not just the latest per member — because the Payments page
// is a full audit ledger showing every transaction.
//
// Superseded rows (tombstoned when a member renews over an unpaid row)
// are excluded from this query — they are internal bookkeeping only
// and are never actionable for gym owners.
//
// Automatically scoped to the calling user's gym via RLS.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Member, MemberMembership, MembershipPlan } from "@/types";

const supabase = createClient();

// Re-exported so PaymentDrawer and page.tsx share one source of truth.
export type PaymentRecord = MemberMembership & {
  member: Member;
  plan: MembershipPlan;
};

// Private to this module — not exported.
async function fetchPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("member_memberships")
    .select("*, member:members(*), plan:membership_plans(*)")
    .neq("payment_status", "superseded")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as PaymentRecord[];
}

/**
 * Fetches all payment records (member_memberships + member + plan).
 *
 * Returns standard TanStack Query shape: { data, isLoading, error, refetch }
 * Automatically scoped to the user's gym via RLS — no gym_id needed client-side.
 *
 * Query key: ["payments"] — invalidated by useRecordPayment and useRenewMembership.
 */
export function usePayments() {
  return useQuery<PaymentRecord[], Error>({
    queryKey: ["payments"],
    queryFn: fetchPayments,
    staleTime: 30 * 1000,    // Re-fetch in background after 30s
    gcTime:   5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
