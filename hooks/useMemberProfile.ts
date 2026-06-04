"use client";

// ============================================================
// hooks/useMemberProfile.ts
// TanStack Query hook that resolves the Member Portal identity.
//
// Two identity paths (per the existing auth architecture):
//   1. Authenticated member — matched by auth.user().email
//   2. Onboarding guest    — matched by ?guest=<member-uuid>
//      (guestId param passed in from the page after reading
//       window.location.search; NOT from localStorage)
//
// Returns MemberProfilePortal | null.
// Scoped via RLS — members_self_read policy gates the query.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MemberProfilePortal } from "@/types";

// ── Fetcher ──────────────────────────────────────────────────────────

async function fetchMemberProfile(
  guestId: string | null,
): Promise<MemberProfilePortal | null> {
  const supabase = createClient();

  // 1. Get the currently authenticated user (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Guest flow: unauthenticated onboarding redirect (?guest=<uuid>)
  if (!user && guestId) {
    const { data, error } = await supabase
      .from("members")
      .select("id, gym_id, full_name, email, phone, joined_date, profile_photo_url")
      .eq("id", guestId)
      .single();

    if (error) throw error;
    return data as MemberProfilePortal;
  }

  // 3. Authenticated member: match by JWT email (RLS enforces gym scope)
  if (user?.email) {
    const { data, error } = await supabase
      .from("members")
      .select("id, gym_id, full_name, email, phone, joined_date, profile_photo_url")
      .eq("email", user.email)
      .single();

    if (error) {
      // PGRST116 = no rows found — not a crash, just no profile yet
      if ((error as { code?: string }).code === "PGRST116") return null;
      throw error;
    }
    return data as MemberProfilePortal;
  }

  // 4. Neither authenticated nor guest — caller should redirect to /login
  return null;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Resolves the logged-in member's profile row.
 *
 * @param guestId  Pass the `?guest=<uuid>` param string for the onboarding
 *                 guest flow; pass null for authenticated members.
 *
 * queryKey: ["member-profile", guestId ?? "auth"]
 * Stale after 60s — profile data changes infrequently.
 */
export function useMemberProfile(guestId: string | null) {
  return useQuery<MemberProfilePortal | null, Error>({
    queryKey: ["member-profile", guestId ?? "auth"],
    queryFn: () => fetchMemberProfile(guestId),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
