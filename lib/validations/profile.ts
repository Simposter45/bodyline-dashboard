import { z } from "zod";

// ── Profile edit — display name (email is read-only) ─────────────────────────

// ── Profile edit (display name and phone) ─────────────────────────────────────

export const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Must be a 10-digit Indian mobile number")
    .or(z.literal("")), // allow clearing the field
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ── Password change ───────────────────────────────────────────────────────────
// Note: `current_password` is a UX-only confirmation field. Supabase Auth's
// client-side updateUser({ password }) does not re-verify the current password
// for an already-authenticated session. The field improves UX safety without
// adding a second server round-trip.

export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from your current password",
    path: ["new_password"],
  });

export type PasswordFormData = z.infer<typeof passwordSchema>;
