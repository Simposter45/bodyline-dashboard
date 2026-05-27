"use client";

// ============================================================
// hooks/useAssignedMembers.ts
// Fetches the authenticated trainer's assigned member roster,
// enriched with each member's current membership, plan, and
// whether they have checked in today.
//
// This is the single data source for:
//   - My Members tab (roster + dues view)
//   - Home tab (today's floor snapshot)
//   - Stats row (checked-in count, pending dues count)
//
// Query key: ["assigned-members", trainerId]
// staleTime: 30s — floor-level accuracy needed
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayRangeIST } from "@/lib/utils/date";
import type {
  AssignedMemberWithDues,
  Member,
  MemberMembership,
  MembershipPlan,
  TrainerAssignment,
} from "@/types";

const supabase = createClient();

async function fetchAssignedMembers(
  trainerId: string,
): Promise<AssignedMemberWithDues[]> {
  const { start, end } = todayRangeIST();

  // Parallel fetch: assignments + today's attendance for the whole gym
  // (filtered client-side to this trainer's member IDs)
  const [assignmentsRes, attendanceRes] = await Promise.all([
    supabase
      .from("trainer_assignments")
      .select(
        `
        id,
        assigned_date,
        member:members(
          *,
          current_membership:member_memberships(
            *,
            plan:membership_plans(*)
          )
        )
        `,
      )
      .eq("trainer_id", trainerId)
      .eq("is_current", true)
      .order("assigned_date", { ascending: false }),

    supabase
      .from("attendance")
      .select("member_id, check_out")
      .gte("check_in", start)
      .lte("check_in", end),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;
  if (attendanceRes.error) throw attendanceRes.error;

  // Build a Set of member_ids that are currently checked in (no check_out yet)
  const checkedInIds = new Set(
    (attendanceRes.data ?? [])
      .filter((a) => a.check_out === null)
      .map((a) => a.member_id),
  );

  return (assignmentsRes.data ?? []).map((row) => {
    const assignment = row as unknown as TrainerAssignment & {
      member: Member & {
        current_membership:
          | ((MemberMembership & { plan: MembershipPlan })[] | null);
      };
    };

    // Supabase returns the nested array; pick the latest non-superseded row
    const memberships = assignment.member.current_membership ?? [];
    const latestMembership = Array.isArray(memberships)
      ? memberships
          .filter((m) => m.payment_status !== "superseded")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0] ?? null
      : null;

    return {
      assignment_id: assignment.id,
      assigned_date: assignment.assigned_date,
      member: assignment.member,
      current_membership: latestMembership,
      is_checked_in_today: checkedInIds.has(assignment.member.id),
    };
  });
}

/**
 * Returns all members currently assigned to the authenticated trainer,
 * enriched with their membership status and today's check-in state.
 *
 * @param trainerId - The trainer's own `trainers.id` (from useTrainerSelf)
 *
 * Returns standard TanStack Query shape: { data, isLoading, error }
 */
export function useAssignedMembers(trainerId: string | undefined) {
  return useQuery<AssignedMemberWithDues[], Error>({
    queryKey: ["assigned-members", trainerId],
    queryFn: () => fetchAssignedMembers(trainerId!),
    enabled: !!trainerId,
    staleTime: 30 * 1000,      // Re-fetch in background after 30s
    gcTime: 5 * 60 * 1000,
  });
}
