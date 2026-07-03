import { z } from "zod";

export const manualJournalSchema = z
  .object({
    transactionDate: z.string().min(1, "Transaction date is required"),
    description: z.string().trim().min(3, "Description is required"),
    sourceReference: z.string().trim().optional(),
    lines: z
      .array(
        z.object({
          accountId: z.string().uuid("Select an account"),
          lineType: z.enum(["DEBIT", "CREDIT"]),
          amount: z
            .string()
            .trim()
            .min(1, "Amount is required")
            .refine((value) => Number(value) > 0, "Amount must be positive"),
          memo: z.string().trim().optional(),
        }),
      )
      .min(2, "A journal entry requires at least 2 lines"),
  })
  .superRefine((values, ctx) => {
    const totalDebits = values.lines
      .filter((line) => line.lineType === "DEBIT")
      .reduce((sum, line) => sum + Number(line.amount), 0);

    const totalCredits = values.lines
      .filter((line) => line.lineType === "CREDIT")
      .reduce((sum, line) => sum + Number(line.amount), 0);

    if (totalDebits !== totalCredits) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: "Total debits must equal total credits",
      });
    }
  });

export type ManualJournalFormValues = z.infer<typeof manualJournalSchema>;