import { z } from "zod";

export const createMemberSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6-9"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  date_of_birth: z.string().min(1, "Date of Birth is required"),
  branch: z.string().min(1, "Branch is required"),
  plan_id: z.string().min(1, "Plan selection is required"),
  payment_method: z.enum(["cash", "upi", "card"], {
    error: "Please select a payment method",
  }),
});

export type CreateMemberFormData = z.infer<typeof createMemberSchema>;

