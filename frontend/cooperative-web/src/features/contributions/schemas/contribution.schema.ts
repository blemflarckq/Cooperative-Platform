import { z } from "zod";

export const contributionSchema = z.object({
  tenantUserId: z.string().uuid("Select a participant"),
  contributionDate: z.string().min(1, "Contribution date is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => Number(value) > 0, "Amount must be positive"),
  source: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"]),
  notes: z.string().trim().optional(),
});

export type ContributionFormValues = z.infer<typeof contributionSchema>;