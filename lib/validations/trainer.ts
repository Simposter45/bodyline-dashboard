import { z } from "zod";

// ============================================================
// lib/validations/trainer.ts
// Zod schemas for all trainer-related forms (FEAT-007).
// ============================================================

// ------------------------------------------------------------------
// Add Trainer
// ------------------------------------------------------------------

export const addTrainerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6–9")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  branch: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type AddTrainerFormData = z.infer<typeof addTrainerSchema>;

// ------------------------------------------------------------------
// Edit Trainer
// All fields optional — partial update; only changed fields sent.
// ------------------------------------------------------------------

export const editTrainerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6–9")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  branch: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type EditTrainerFormData = z.infer<typeof editTrainerSchema>;

// ------------------------------------------------------------------
// Assign Member
// ------------------------------------------------------------------

export const assignMemberSchema = z.object({
  member_id: z.string().uuid("Invalid member selection"),
});

export type AssignMemberFormData = z.infer<typeof assignMemberSchema>;
