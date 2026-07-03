import { z } from "zod";

export const accountingSettingsSchema = z.object({
  cashAccountId: z.string().uuid("Select a cash/bank account"),
  memberSavingsLiabilityAccountId: z
    .string()
    .uuid("Select a member savings liability account"),
  loanReceivableAccountId: z.string().uuid("Select a loan receivable account"),
  interestIncomeAccountId: z.string().uuid("Select an interest income account"),
  penaltyIncomeAccountId: z.string().uuid("Select a penalty income account"),
});

export type AccountingSettingsFormValues = z.infer<
  typeof accountingSettingsSchema
>;