"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { SendReminderPayload } from "@/app/api/whatsapp/route";

export function useSendReminder() {
  return useMutation({
    mutationFn: async (payload: SendReminderPayload) => {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Attempt to parse the error message from the server response
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send reminder");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Reminder sent via WhatsApp! ✅");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast.error(msg);
    },
  });
}
