import { z } from "zod";

export const accountSchema = z.object({
  code: z.string().trim().min(2, "Account code is required"),
  name: z.string().trim().min(2, "Account name is required"),
  description: z.string().trim().optional(),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
});

export type AccountFormValues = z.infer<typeof accountSchema>;