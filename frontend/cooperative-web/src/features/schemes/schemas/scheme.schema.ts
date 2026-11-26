import { z } from "zod";

export const schemeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give it a name of at least 2 characters")
    .max(160, "That name is too long"),
  description: z.string().trim().max(1000, "That's too long — keep it under 1000 characters").optional(),
  code: z.string().trim().max(80, "That code is too long").optional(),
  cycleMode: z.enum(["FIXED_PERIOD", "OPEN_ENDED", "PROJECT_BASED"]),
  contributionMode: z.enum([
    "MONTHLY_FIXED",
    "EVENT_TRIGGERED",
    "VOLUNTARY",
    "PROJECT_TARGET",
  ]),
  loanMode: z.enum([
    "DISABLED",
    "SELF_BACKED",
    "PEER_FUNDED",
    "SELF_AND_PEER_FUNDED",
  ]),
  payoutMode: z.enum([
    "END_OF_CYCLE",
    "NO_PAYOUT",
    "EVENT_BENEFICIARY",
    "PROJECT_EXPENSE",
  ]),
});

export type SchemeFormValues = z.infer<typeof schemeSchema>;
