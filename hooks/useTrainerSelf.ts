"use client";

// ============================================================
// hooks/useTrainerSelf.ts
// Identity anchor for the entire Trainer Portal.
//
// Fetches the trainers row WHERE trainer_auth_user_id = auth.uid().
// This is how the portal identifies "which trainer is logged in"
// without relying on email lookups or raw useEffect fetches.
//
// staleTime: Infinity — identity is stable for the lifetime of a session.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Trainer } from "@/types";

const supabase = createClient();

async function fetchTrainerSelf(): Promise<Trainer> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("trainers")
    .select("*")
    .eq("trainer_auth_user_id", user.id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Trainer profile not found for this account.");

  return data as Trainer;
}

/**
 * Returns the authenticated trainer's own profile row.
 *
 * Usage:
 *   const { data: trainer, isLoading, error } = useTrainerSelf();
 *
 * staleTime: Infinity — the trainer's own identity does not change during a session.
 */
export function useTrainerSelf() {
  return useQuery<Trainer, Error>({
    queryKey: ["trainer-self"],
    queryFn: fetchTrainerSelf,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false, // Don't retry — a missing profile is a hard error
  });
}
