import type { Loan } from "../types/loan.types";

/**
 * Resolves what a loan's status should actually SHOW as, which isn't
 * always the same as loan.status alone. loan.status stays
 * PENDING_APPROVAL right up until disbursement (correctly — the loan
 * genuinely isn't active until the money moves), but a viewer needs to
 * know whether that means "still waiting on someone" or "decision made,
 * just needs sending" — two very different situations that looked
 * identical before this existed.
 */
export function getLoanDisplayStatus(loan: Loan): string {
  if (loan.status === "PENDING_APPROVAL" && loan.outboundRequest?.status === "APPROVED") {
    return "LOAN_READY_TO_DISBURSE";
  }

  return loan.status;
}

/** Whether disbursing would actually succeed right now, not just whether
 * the loan is in the right broad status bucket. */
export function isReadyToDisburse(loan: Loan): boolean {
  return loan.status === "PENDING_APPROVAL" && loan.outboundRequest?.status === "APPROVED";
}
