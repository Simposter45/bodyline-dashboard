"use client";

// ============================================================
// hooks/useBookings.ts
// TanStack Query hook for fetching a member's upcoming
// PT session booking requests (session_date >= today).
//
// Used by: SessionsTab in the Member Portal.
//
// Returns BookingWithTrainer[] — ordered by session_date asc,
// so the nearest session appears first.
//
// Scoped via RLS — bookings_member_self_rw policy ensures
// members only ever see their own booking rows.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils/date";
import type { BookingWithTrainer, Trainer } from "@/types";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchBookings(memberId: string): Promise<BookingWithTrainer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, gym_id, member_id, trainer_id, session_date, session_time, status, notes, created_at, trainer:trainers(id, full_name, specialization)",
    )
    .eq("member_id", memberId)
    .gte("session_date", todayISO())
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true })
    .limit(20);

  if (error) throw error;

  // Supabase returns the joined trainer as an object or array depending on
  // the relationship cardinality. Normalise to always be a plain object.
  return ((data ?? []) as Array<
    Omit<BookingWithTrainer, "trainer"> & {
      trainer: Pick<Trainer, "id" | "full_name" | "specialization"> | Pick<Trainer, "id" | "full_name" | "specialization">[] | null;
    }
  >).map((row) => ({
    ...row,
    trainer: (Array.isArray(row.trainer) ? row.trainer[0] : row.trainer) as Pick<
      Trainer,
      "id" | "full_name" | "specialization"
    >,
  })) as BookingWithTrainer[];
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches the member's upcoming PT booking requests
 * (session_date >= today, ordered ascending by date + time).
 *
 * @param memberId  The authenticated member's UUID from useMemberProfile.
 *                  Pass null to hold the query while the profile is loading.
 *
 * queryKey: ["bookings", memberId]
 * Stale after 30s — bookings can be confirmed/cancelled by the trainer.
 */
export function useBookings(memberId: string | null) {
  return useQuery<BookingWithTrainer[], Error>({
    queryKey: ["bookings", memberId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchBookings(memberId!),
    enabled: memberId !== null,
    staleTime: 30 * 1000,
  });
}
