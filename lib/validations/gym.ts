import { z } from "zod";

// Allowed preset accent colors from the immutable design system (AGENTS.md §2)
// Updated to a professional gym branding palette
export const ALLOWED_PRIMARY_COLORS = [
  "#3b82f6", // Ocean Blue
  "#8b5cf6", // Amethyst Purple
  "#10b981", // Emerald Green
  "#f97316", // Sunset Orange
  "#64748b", // Graphite Slate
] as const;

export type PrimaryColor = (typeof ALLOWED_PRIMARY_COLORS)[number];

export const gymSettingsSchema = z.object({
  gym_display_name: z
    .string()
    .min(2, "Gym name must be at least 2 characters")
    .max(80, "Gym name must be 80 characters or fewer"),

  tagline: z
    .string()
    .max(120, "Tagline must be 120 characters or fewer")
    .optional()
    .or(z.literal("")),

  primary_color: z.enum(
    ALLOWED_PRIMARY_COLORS as unknown as [string, ...string[]],
    { error: "Please select a valid accent color" }
  ),

  whatsapp_number: z
    .string()
    .regex(
      /^\d{10,15}$/,
      "Must be a 10–15 digit number (digits only, no +, spaces, or dashes)"
    )
    .optional()
    .or(z.literal("")),

  upi_id: z
    .string()
    .regex(
      /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/,
      "Must be a valid UPI ID (e.g. name@upi)"
    )
    .optional()
    .or(z.literal("")),

  // Set by the upload widget — not directly user-typed
  logo_url: z.string().url().optional().or(z.literal("")),
});

export type GymSettingsFormData = z.infer<typeof gymSettingsSchema>;
