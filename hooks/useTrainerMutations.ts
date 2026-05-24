"use client";

// ============================================================
// hooks/useTrainerMutations.ts
// TanStack Query mutation hooks for all trainer write operations.
// (FEAT-007)
//
// useAddTrainer    — inserts a new trainer row
// useEditTrainer   — updates an existing trainer row
// useAssignMember  — inserts a trainer_assignment row,
//                    de-activating any prior active assignment
//                    for that member first (upsert pattern).
//
// All hooks invalidate ["trainers"] on success so the trainer
// card grid and assignment panel stay in sync automatically.
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { AddTrainerFormData, EditTrainerFormData } from "@/lib/validations/trainer";

const supabase = createClient();

// ------------------------------------------------------------------
// useAddTrainer
// ------------------------------------------------------------------

export function useAddTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddTrainerFormData) => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Authentication error.");

      const gymId = user.app_metadata?.gym_id;
      if (!gymId) throw new Error("No gym assigned.");

      const payload = {
        gym_id: gymId,
        full_name: data.full_name,
        phone:          data.phone          || null,
        email:          data.email          || null,
        specialization: data.specialization || null,
        branch:         data.branch         || null,
        is_active:      data.is_active,
      };

      const { error } = await supabase.from("trainers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer added successfully");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to add trainer";
      toast.error(msg);
    },
  });
}

// ------------------------------------------------------------------
// useEditTrainer
// ------------------------------------------------------------------

interface EditTrainerPayload extends EditTrainerFormData {
  id: string;
}

export function useEditTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: EditTrainerPayload) => {
      const payload = {
        full_name:      data.full_name,
        phone:          data.phone          || null,
        email:          data.email          || null,
        specialization: data.specialization || null,
        branch:         data.branch         || null,
        is_active:      data.is_active,
      };

      const { error } = await supabase
        .from("trainers")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer updated");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to update trainer";
      toast.error(msg);
    },
  });
}

// ------------------------------------------------------------------
// useAssignMember
// Upsert pattern:
//   1. Set is_current = false on all existing active assignments
//      for this member (across any trainer).
//   2. Insert a new assignment row with is_current = true.
// This ensures a member always has at most one active trainer.
// ------------------------------------------------------------------

interface AssignMemberPayload {
  trainerId: string;
  memberId:  string;
}

export function useAssignMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trainerId, memberId }: AssignMemberPayload) => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Authentication error.");

      const gymId = user.app_metadata?.gym_id;
      if (!gymId) throw new Error("No gym assigned.");

      // Step 1: deactivate any existing current assignment for this member
      const { error: deactivateError } = await supabase
        .from("trainer_assignments")
        .update({ is_current: false })
        .eq("member_id", memberId)
        .eq("is_current", true);
      if (deactivateError) throw deactivateError;

      // Step 2: insert the new assignment
      const { error: insertError } = await supabase
        .from("trainer_assignments")
        .insert({
          gym_id:        gymId,
          trainer_id:    trainerId,
          member_id:     memberId,
          assigned_date: new Date().toISOString().split("T")[0], // date portion only
          is_current:    true,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Member assigned to trainer");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to assign member";
      toast.error(msg);
    },
  });
}
