import { z } from "zod";

export const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60, "Name must be 60 characters or fewer"),
  price: z.number().int().min(0, "Price must be at least ₹0"),
  duration_days: z.number().int().min(1, "Duration must be at least 1 day").max(3650, "Duration cannot exceed 10 years"),
  max_freeze_days: z.number().int().min(0, "Max freeze days cannot be negative").max(365, "Max freeze days cannot exceed 365"),
  description: z.string().max(200, "Description must be 200 characters or fewer").optional().or(z.literal("")),
});

export type PlanFormData = z.infer<typeof planSchema>;
