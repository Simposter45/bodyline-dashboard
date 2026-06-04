"use client";

// ============================================================
// hooks/useTrainerBookings.ts
// TanStack Query hook for fetching a trainer's upcoming
// PT session booking requests (session_date >= today).
//
// Used by: SessionsTab in the Trainer Portal.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils/date";
import type { BookingWithMember, Member } from "@/types";

async function fetchTrainerBookings(trainerId: string): Promise<BookingWithMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, gym_id, member_id, trainer_id, session_date, session_time, status, notes, created_at, member:members(id, full_name, phone, profile_photo_url)"
    )
    .eq("trainer_id", trainerId)
    .gte("session_date", todayISO())
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Array<
    Omit<BookingWithMember, "member"> & {
      member: Pick<Member, "id" | "full_name" | "phone" | "profile_photo_url"> | Pick<Member, "id" | "full_name" | "phone" | "profile_photo_url">[] | null;
    }
  >).map((row) => ({
    ...row,
    member: (Array.isArray(row.member) ? row.member[0] : row.member) as Pick<
      Member,
      "id" | "full_name" | "phone" | "profile_photo_url"
    >,
  })) as BookingWithMember[];
}

export function useTrainerBookings(trainerId: string | null) {
  return useQuery<BookingWithMember[], Error>({
    queryKey: ["trainer-bookings", trainerId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchTrainerBookings(trainerId!),
    enabled: trainerId !== null,
    staleTime: 30 * 1000,
  });
}
