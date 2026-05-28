"use client";

// ============================================================
// hooks/useSessionLogs.ts
// Two exports for the Session Logs tab:
//
//   useSessionLogs(trainerId, days?)
//     → Fetches this trainer's session logs for the last N days,
//       enriched with each member's display info.
//
//   useLogSession()
//     → Mutation to insert a new session_log row.
//       Invalidates the session log query on success.
//
// Session logs are immutable once inserted (no edit/delete).
// The RLS INSERT policy enforces:
//   - trainer_id matches the authenticated trainer
//   - member_id must be an assigned member of that trainer
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { lastNDaysRangeIST, todayRangeIST } from "@/lib/utils/date";
import toast from "react-hot-toast";
import type { SessionLogWithMember, LogSessionInput } from "@/types";

const supabase = createClient();

// ── Query: session log history ────────────────────────────────────────────────

async function fetchSessionLogs(
  trainerId: string,
  days: number,
): Promise<SessionLogWithMember[]> {
  const { start, end } = lastNDaysRangeIST(days);

  const { data, error } = await supabase
    .from("session_logs")
    .select(
      `
      *,
      member:members(id, full_name, phone, profile_photo_url)
      `,
    )
    .eq("trainer_id", trainerId)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SessionLogWithMember[];
}

/**
 * Returns the authenticated trainer's session logs for the last N days,
 * each enriched with the member's display info (name, phone, photo).
 *
 * @param trainerId - The trainer's own `trainers.id` (from useTrainerSelf)
 * @param days - Lookback window in days (default 30)
 */
export function useSessionLogs(trainerId: string | undefined, days = 30) {
  return useQuery<SessionLogWithMember[], Error>({
    queryKey: ["session-logs", trainerId, days],
    queryFn: () => fetchSessionLogs(trainerId!, days),
    enabled: !!trainerId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ── Query: today's session count (for stats row) ──────────────────────────────

async function fetchSessionCountToday(trainerId: string): Promise<number> {
  const { start, end } = todayRangeIST();

  const { count, error } = await supabase
    .from("session_logs")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Returns the count of sessions logged by this trainer today.
 * Used to populate the Stats row on the Home tab.
 */
export function useSessionCountToday(trainerId: string | undefined) {
  return useQuery<number, Error>({
    queryKey: ["session-count-today", trainerId],
    queryFn: () => fetchSessionCountToday(trainerId!),
    enabled: !!trainerId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ── Mutation: log a session ───────────────────────────────────────────────────

interface LogSessionPayload extends LogSessionInput {
  trainer_id: string;
  gym_id: string;
}

export function useLogSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trainer_id,
      gym_id,
      member_id,
      session_date,
      session_type,
      duration_mins,
      notes,
    }: LogSessionPayload) => {
      const { error } = await supabase.from("session_logs").insert({
        trainer_id,
        gym_id,
        member_id,
        session_date,
        session_type,
        duration_mins: duration_mins ?? null,
        notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { trainer_id }) => {
      void queryClient.invalidateQueries({
        queryKey: ["session-logs", trainer_id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["session-count-today", trainer_id],
      });
      toast.success("Session logged!");
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Failed to log session.";
      toast.error(msg);
    },
  });
}
