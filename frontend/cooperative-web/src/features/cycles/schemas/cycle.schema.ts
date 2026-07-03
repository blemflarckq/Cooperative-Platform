import { z } from "zod";

export const cycleSchema = z
  .object({
    name: z.string().trim().min(2, "Cycle name is required"),
    code: z.string().trim().optional(),
    startsOn: z.string().optional(),
    endsOn: z.string().optional(),

    targetAmount: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((value) => {
        if (value === undefined || value === "") return undefined;
        return Number(value);
      })
      .refine(
        (value) => value === undefined || Number.isFinite(value),
        "Target amount must be a valid number",
      ),
  })
  .refine(
    (values) => {
      if (!values.startsOn || !values.endsOn) return true;
      return values.startsOn <= values.endsOn;
    },
    {
      path: ["endsOn"],
      message: "End date cannot be before start date",
    },
  );

export type CycleFormInput = z.input<typeof cycleSchema>;
export type CycleFormValues = z.output<typeof cycleSchema>;