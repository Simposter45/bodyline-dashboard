"use client";

// ============================================================
// hooks/useMemberAttendance.ts
// TanStack Query hook for fetching a member's personal
// attendance history (their own check-in / check-out logs).
//
// Used by: HistoryTab in the Member Portal.
//
// Returns Attendance[] — the most recent 30 records, newest first.
// Timestamps are stored in UTC; display-layer components must
// format via lib/utils/date.ts (formatDateIST etc.) — never raw.
//
// Scoped via RLS — att_self_read policy gates the query so
// members only ever see their own records.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Attendance } from "@/types";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchMemberAttendance(memberId: string): Promise<Attendance[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("attendance")
    .select("id, gym_id, member_id, check_in, check_out, notes")
    .eq("member_id", memberId)
    .order("check_in", { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data ?? []) as Attendance[];
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches the last 30 attendance records for the given member.
 * Records are ordered newest-first.
 *
 * @param memberId  The authenticated member's UUID from useMemberProfile.
 *                  Pass null to hold the query while profile is loading.
 *
 * queryKey: ["member-attendance", memberId]
 * Stale after 60s — history changes infrequently (check-ins are
 * logged by staff, not in real-time by the member).
 */
export function useMemberAttendance(memberId: string | null) {
  return useQuery<Attendance[], Error>({
    queryKey: ["member-attendance", memberId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchMemberAttendance(memberId!),
    enabled: memberId !== null,
    staleTime: 60 * 1000,
  });
}
