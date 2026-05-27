"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { addDays, todayISO } from "@/lib/utils/date";

const supabase = createClient();

// Helper: resolve gym_id from JWT app_metadata
async function getGymId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  const gymId = user.app_metadata?.gym_id as string | undefined;
  if (!gymId) throw new Error("No gym assigned to this user.");
  return gymId;
}

// ── Pause Subscription ─────────────────────────────────────────────────────

export type PausePayload = {
  membershipId: string;
  memberId: string;
  pausedUntil: string; // ISO date string (YYYY-MM-DD)
};

export function usePauseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, memberId, pausedUntil }: PausePayload) => {
      const gymId = await getGymId();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("member_memberships")
        .update({
          paused_at: now,
          paused_until: pausedUntil,
        })
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .eq("member_id", memberId);

      if (error) throw error;
      return true;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", vars.memberId] });
      toast.success("Membership paused successfully");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to pause membership";
      toast.error(msg);
    },
  });
}

// ── Resume Subscription ────────────────────────────────────────────────────

export type ResumePayload = {
  membershipId: string;
  memberId: string;
  pausedAt: string;       // ISO timestamp when pause started
  currentEndDate: string; // ISO date of current end_date
};

export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, memberId, pausedAt, currentEndDate }: ResumePayload) => {
      const gymId = await getGymId();

      // Calculate how many days the membership was paused
      const pausedAtDate = new Date(pausedAt);
      const resumeDate = new Date();
      const frozenDays = Math.max(
        0,
        Math.ceil((resumeDate.getTime() - pausedAtDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Extend end_date by the number of frozen days
      const newEndDate = addDays(frozenDays, currentEndDate);

      const { error } = await supabase
        .from("member_memberships")
        .update({
          paused_at: null,
          paused_until: null,
          end_date: newEndDate,
        })
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .eq("member_id", memberId);

      if (error) throw error;
      return { frozenDays, newEndDate };
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", vars.memberId] });
      toast.success(
        `Membership resumed — extended by ${result.frozenDays} day${result.frozenDays !== 1 ? "s" : ""} to ${result.newEndDate}`
      );
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to resume membership";
      toast.error(msg);
    },
  });
}

// ── Extend Subscription ────────────────────────────────────────────────────

export type ExtendPayload = {
  membershipId: string;
  memberId: string;
  currentEndDate: string; // ISO date string
  daysToAdd: number;
};

export function useExtendSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, memberId, currentEndDate, daysToAdd }: ExtendPayload) => {
      const gymId = await getGymId();
      const newEndDate = addDays(daysToAdd, currentEndDate);

      const { error } = await supabase
        .from("member_memberships")
        .update({ end_date: newEndDate })
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .eq("member_id", memberId);

      if (error) throw error;
      return newEndDate;
    },
    onSuccess: (newEndDate, vars) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", vars.memberId] });
      toast.success(`Membership extended to ${newEndDate}`);
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to extend membership";
      toast.error(msg);
    },
  });
}

// ── Cancel Subscription ────────────────────────────────────────────────────

export type CancelPayload = {
  membershipId: string;
  memberId: string;
};

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, memberId }: CancelPayload) => {
      const gymId = await getGymId();

      // 1. Supersede the active membership
      const { error: mmErr } = await supabase
        .from("member_memberships")
        .update({ payment_status: "superseded" })
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .eq("member_id", memberId);

      if (mmErr) throw mmErr;

      // 2. Mark the member as inactive
      const { error: memberErr } = await supabase
        .from("members")
        .update({ is_active: false })
        .eq("id", memberId)
        .eq("gym_id", gymId);

      if (memberErr) throw memberErr;

      return true;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", vars.memberId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Membership cancelled — member marked as inactive");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to cancel membership";
      toast.error(msg);
    },
  });
}
