import { round2 } from "./loan-tranche-split";

export interface RepaymentAllocation {
  selfFundedInterestPortion: number;
  selfFundedPrincipalPortion: number;
  peerFundedInterestPortion: number;
  peerFundedPrincipalPortion: number;
  /** Any amount left over after both tranches are fully settled (overpayment). */
  overpaymentRemainder: number;
}

export interface PledgeAllocation {
  loanPledgeId: string;
  principalPortion: number;
  interestPortion: number;
}

/**
 * Splits a value proportionally between two shares, guaranteeing the two
 * results always sum exactly to `total` — the second share is derived by
 * subtraction rather than independently rounded, which is what prevents
 * two "correctly rounded" numbers from silently failing to add up to the
 * real total. That failure mode is exactly the kind of thing that looks
 * fine in testing with round numbers and then loses or gains a cent in
 * production with real ones.
 */
function splitProportionally(
  total: number,
  weightA: number,
  weightB: number,
): [number, number] {
  const totalWeight = weightA + weightB;

  if (totalWeight <= 0) {
    return [0, 0];
  }

  const shareA = round2(total * (weightA / totalWeight));
  const shareB = round2(total - shareA);

  return [shareA, shareB];
}

/**
 * Allocates one repayment amount across a loan's two tranches. Interest
 * due is paid first (on both tranches, proportionally if the payment is
 * too small to cover all of it), then whatever remains goes to principal,
 * proportionally by each tranche's outstanding balance. Interest is
 * always computed reducing-balance style: outstanding principal × that
 * tranche's current monthly rate.
 */
export function allocateRepayment(input: {
  amount: number;
  selfFundedOutstandingPrincipal: number;
  selfFundedMonthlyRate: number;
  peerFundedOutstandingPrincipal: number;
  peerFundedMonthlyRate: number;
}): RepaymentAllocation {
  const selfInterestDue = round2(
    (input.selfFundedOutstandingPrincipal * input.selfFundedMonthlyRate) / 100,
  );
  const peerInterestDue = round2(
    (input.peerFundedOutstandingPrincipal * input.peerFundedMonthlyRate) / 100,
  );
  const totalInterestDue = round2(selfInterestDue + peerInterestDue);

  if (totalInterestDue > 0 && input.amount <= totalInterestDue) {
    const [selfFundedInterestPortion, peerFundedInterestPortion] =
      splitProportionally(input.amount, selfInterestDue, peerInterestDue);

    return {
      selfFundedInterestPortion,
      peerFundedInterestPortion,
      selfFundedPrincipalPortion: 0,
      peerFundedPrincipalPortion: 0,
      overpaymentRemainder: 0,
    };
  }

  const remainingForPrincipal = round2(input.amount - totalInterestDue);
  const totalOutstandingPrincipal = round2(
    input.selfFundedOutstandingPrincipal + input.peerFundedOutstandingPrincipal,
  );

  if (totalOutstandingPrincipal <= 0) {
    return {
      selfFundedInterestPortion: selfInterestDue,
      peerFundedInterestPortion: peerInterestDue,
      selfFundedPrincipalPortion: 0,
      peerFundedPrincipalPortion: 0,
      overpaymentRemainder: remainingForPrincipal,
    };
  }

  if (remainingForPrincipal >= totalOutstandingPrincipal) {
    return {
      selfFundedInterestPortion: selfInterestDue,
      peerFundedInterestPortion: peerInterestDue,
      selfFundedPrincipalPortion: round2(input.selfFundedOutstandingPrincipal),
      peerFundedPrincipalPortion: round2(input.peerFundedOutstandingPrincipal),
      overpaymentRemainder: round2(remainingForPrincipal - totalOutstandingPrincipal),
    };
  }

  const [selfFundedPrincipalPortion, peerFundedPrincipalPortion] =
    splitProportionally(
      remainingForPrincipal,
      input.selfFundedOutstandingPrincipal,
      input.peerFundedOutstandingPrincipal,
    );

  return {
    selfFundedInterestPortion: selfInterestDue,
    peerFundedInterestPortion: peerInterestDue,
    selfFundedPrincipalPortion,
    peerFundedPrincipalPortion,
    overpaymentRemainder: 0,
  };
}

/**
 * Distributes a peer-funded repayment portion (principal and interest,
 * already computed by allocateRepayment) across the individual members
 * who pledged toward that loan — proportional to each pledge's own
 * outstanding balance. Uses the same exact-sum guarantee as
 * splitProportionally, generalized to N pledges: every pledge except the
 * last gets its independently rounded share, and the last absorbs
 * whatever's left, so the full set always sums exactly to the input
 * amount.
 */
export function allocateAcrossPledges(input: {
  totalPrincipal: number;
  totalInterest: number;
  pledges: { loanPledgeId: string; outstandingPrincipal: number }[];
}): PledgeAllocation[] {
  const totalOutstanding = input.pledges.reduce(
    (sum, pledge) => sum + pledge.outstandingPrincipal,
    0,
  );

  if (input.pledges.length === 0 || totalOutstanding <= 0) {
    return [];
  }

  let principalRemaining = input.totalPrincipal;
  let interestRemaining = input.totalInterest;

  return input.pledges.map((pledge, index) => {
    const isLast = index === input.pledges.length - 1;
    const weight = pledge.outstandingPrincipal / totalOutstanding;

    const principalPortion = isLast
      ? round2(principalRemaining)
      : round2(input.totalPrincipal * weight);

    const interestPortion = isLast
      ? round2(interestRemaining)
      : round2(input.totalInterest * weight);

    principalRemaining = round2(principalRemaining - principalPortion);
    interestRemaining = round2(interestRemaining - interestPortion);

    return {
      loanPledgeId: pledge.loanPledgeId,
      principalPortion,
      interestPortion,
    };
  });
}
