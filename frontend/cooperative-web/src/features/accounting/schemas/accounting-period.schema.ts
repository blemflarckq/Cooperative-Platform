import { z } from "zod";

export const accountingPeriodSchema = z
  .object({
    name: z.string().trim().min(2, "Period name is required"),
    startsOn: z.string().min(1, "Start date is required"),
    endsOn: z.string().min(1, "End date is required"),
  })
  .refine((values) => values.startsOn <= values.endsOn, {
    path: ["endsOn"],
    message: "End date cannot be before start date",
  });

export type AccountingPeriodFormValues = z.infer<
  typeof accountingPeriodSchema
>;