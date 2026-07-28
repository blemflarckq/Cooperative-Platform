import { BadRequestException } from "@nestjs/common";

export interface TrancheSplit {
  selfFundedPrincipal: number;
  peerFundedPrincipal: number;
}

/**
 * Splits a requested loan amount into its self-funded and peer-funded
 * tranches. The self-funded tranche is whatever the borrower's own
 * current contribution balance can cover; anything beyond that becomes
 * the peer-funded tranche, requiring other members' pledges.
 *
 * A negative or zero contribution balance is treated as zero rather than
 * throwing — a brand new member with no contributions yet should still be
 * able to request a fully peer-funded loan, not be blocked by this
 * function specifically.
 */
export function splitLoanIntoTranches(input: {
  requestedAmount: number;
  borrowerContributionBalance: number;
}): TrancheSplit {
  if (input.requestedAmount <= 0) {
    throw new BadRequestException("requestedAmount must be greater than zero.");
  }

  const availableSelfFunding = Math.max(0, input.borrowerContributionBalance);
  const selfFundedPrincipal = Math.min(input.requestedAmount, availableSelfFunding);
  const peerFundedPrincipal = round2(input.requestedAmount - selfFundedPrincipal);

  return {
    selfFundedPrincipal: round2(selfFundedPrincipal),
    peerFundedPrincipal,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
