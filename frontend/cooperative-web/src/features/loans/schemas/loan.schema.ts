import { z } from "zod";

export const requestLoanSchema = z.object({
  amount: z
    .string()
    .min(1, "Enter an amount")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  purpose: z.string().min(1, "Tell us what it's for"),
});

export type RequestLoanFormValues = z.infer<typeof requestLoanSchema>;
