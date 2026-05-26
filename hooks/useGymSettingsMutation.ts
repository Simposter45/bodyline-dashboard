"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import type { GymSettingsFormData } from "@/lib/validations/gym";

const supabase = createClient();

// ── Update Gym Settings ────────────────────────────────────────────────────────

export function useUpdateGymSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: GymSettingsFormData) => {
      // Resolve the current user's gym_id from app_metadata (set at onboarding)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const gymId = user?.app_metadata?.gym_id as string | undefined;
      if (!gymId) throw new Error("Could not resolve gym — please sign out and sign back in.");

      const { data, error } = await supabase
        .from("gym_settings")
        .update({
          gym_display_name: formData.gym_display_name,
          tagline: formData.tagline ?? null,
          primary_color: formData.primary_color,
          whatsapp_number: formData.whatsapp_number || null,
          upi_id: formData.upi_id || null,
          ...(formData.logo_url !== undefined && { logo_url: formData.logo_url }),
          updated_at: new Date().toISOString(),
        })
        .eq("gym_id", gymId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-settings"] });
      toast.success("Gym settings saved successfully");
    },

    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Failed to save gym settings";
      toast.error(msg);
    },
  });
}
