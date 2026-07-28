import { AtCapBehavior } from "../enums/loan.enums";
import { round2 } from "./loan-tranche-split";

export interface RateEscalationResult {
  nextRate: number;
  shouldFlagAtRisk: boolean;
}

/**
 * Computes the peer-funded tranche's interest rate for the next month.
 * This only ever applies to the peer-funded portion — the self-funded
 * tranche uses a single fixed rate and never escalates, since there's no
 * peer risk to price in.
 *
 * Behavior:
 * - Below the cap: increases by the configured increment, clamped so it
 *   never overshoots the cap in a single step.
 * - Already at the cap: what happens next depends on the scheme's
 *   AtCapBehavior —
 *   - CONTINUE_AT_CAP: rate simply stays at the cap indefinitely.
 *   - FLAG_AND_BLOCK: rate stays at the cap, but the borrower is now
 *     flagged at-risk (the caller is responsible for actually blocking
 *     new loans and persisting the flag — this function only decides
 *     whether that should happen).
 */
export function computeNextMonthlyRate(input: {
  currentRate: number;
  increment: number;
  capRate: number;
  atCapBehavior: AtCapBehavior;
}): RateEscalationResult {
  if (input.currentRate >= input.capRate) {
    if (input.atCapBehavior === AtCapBehavior.CONTINUE_AT_CAP) {
      return { nextRate: round2(input.capRate), shouldFlagAtRisk: false };
    }

    return { nextRate: round2(input.capRate), shouldFlagAtRisk: true };
  }

  const escalated = input.currentRate + input.increment;
  const nextRate = Math.min(escalated, input.capRate);

  return { nextRate: round2(nextRate), shouldFlagAtRisk: false };
}
