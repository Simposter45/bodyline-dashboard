import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

const supabase = createClient();

// ── Update Display Name ───────────────────────────────────────────────────────

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fullName: string) => {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate the current user query so the Nav updates instantly
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(msg);
    },
  });
}

// ── Change Password ───────────────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to update password";
      toast.error(msg);
    },
  });
}
