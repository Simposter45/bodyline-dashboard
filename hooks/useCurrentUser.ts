"use client";

// ============================================================
// hooks/useCurrentUser.ts
// TanStack Query hook for the authenticated user's display name.
// Extracted from dashboard/page.tsx useEffect — single source of truth.
//
// staleTime: Infinity — the auth user identity does not change
// during a session, so there is no benefit in re-fetching it.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface CurrentUser {
  userName: string;
}

async function fetchCurrentUser(): Promise<CurrentUser> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  const userName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "User";

  return { userName };
}

/**
 * Returns the display name of the currently authenticated user.
 *
 * Usage:
 *   const { data } = useCurrentUser();
 *   const name = data?.userName ?? "";
 *
 * Returns standard TanStack Query shape: { data, isLoading, error }
 */
export function useCurrentUser() {
  return useQuery<CurrentUser, Error>({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: Infinity, // Auth identity is stable for the lifetime of a session
    gcTime: Infinity,    // Keep in cache until explicit sign-out
  });
}
