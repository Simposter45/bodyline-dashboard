"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import type { PlanFormData } from "@/lib/validations/plan";
import type { MembershipPlan } from "@/types";

const supabase = createClient();

// Helper to get current gym ID
async function getGymId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  const gymId = user.app_metadata?.gym_id as string | undefined;
  if (!gymId) throw new Error("No gym assigned to this user.");
  return gymId;
}

// ── Create Plan ────────────────────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PlanFormData) => {
      const gymId = await getGymId();
      const { data: result, error } = await supabase
        .from("membership_plans")
        .insert({
          gym_id: gymId,
          name: data.name,
          price: data.price,
          duration_days: data.duration_days,
          max_freeze_days: data.max_freeze_days,
          description: data.description || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result as MembershipPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Membership plan created");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to create plan";
      toast.error(msg);
    },
  });
}

// ── Update Plan ────────────────────────────────────────────────────────

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const gymId = await getGymId();
      const { data: result, error } = await supabase
        .from("membership_plans")
        .update({
          name: data.name,
          price: data.price,
          duration_days: data.duration_days,
          max_freeze_days: data.max_freeze_days,
          description: data.description || null,
        })
        .eq("id", id)
        .eq("gym_id", gymId)
        .select()
        .single();

      if (error) throw error;
      return result as MembershipPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Membership plan updated");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to update plan";
      toast.error(msg);
    },
  });
}

// ── Deactivate Plan ────────────────────────────────────────────────────

export function useDeactivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const gymId = await getGymId();
      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: false })
        .eq("id", id)
        .eq("gym_id", gymId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deactivated");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to deactivate plan";
      toast.error(msg);
    },
  });
}

// ── Restore Plan ───────────────────────────────────────────────────────

export function useRestorePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const gymId = await getGymId();
      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: true })
        .eq("id", id)
        .eq("gym_id", gymId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan restored");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to restore plan";
      toast.error(msg);
    },
  });
}
