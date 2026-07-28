import { allocateAcrossPledges, allocateRepayment } from './loan-repayment-allocation';
import { describe, expect, it } from '@jest/globals';

describe('allocateRepayment', () => {
  it('a partial payment smaller than total interest due pays only interest, split proportionally', () => {
    // self interest due = 1000 * 2% = 20, peer interest due = 2000 * 3% = 60
    // total interest due = 80. Paying 40 (half) should split proportionally: 10 / 30
    const result = allocateRepayment({
      amount: 40,
      selfFundedOutstandingPrincipal: 1000,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 2000,
      peerFundedMonthlyRate: 3,
    });

    expect(result.selfFundedInterestPortion).toBe(10);
    expect(result.peerFundedInterestPortion).toBe(30);
    expect(result.selfFundedPrincipalPortion).toBe(0);
    expect(result.peerFundedPrincipalPortion).toBe(0);
    expect(result.overpaymentRemainder).toBe(0);

    // The core invariant: the parts must always sum back to the whole.
    const sum =
      result.selfFundedInterestPortion +
      result.peerFundedInterestPortion +
      result.selfFundedPrincipalPortion +
      result.peerFundedPrincipalPortion +
      result.overpaymentRemainder;
    expect(sum).toBeCloseTo(40, 2);
  });

  it('a payment exactly covering interest pays no principal', () => {
    const result = allocateRepayment({
      amount: 80,
      selfFundedOutstandingPrincipal: 1000,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 2000,
      peerFundedMonthlyRate: 3,
    });

    expect(result.selfFundedInterestPortion).toBe(20);
    expect(result.peerFundedInterestPortion).toBe(60);
    expect(result.selfFundedPrincipalPortion).toBe(0);
    expect(result.peerFundedPrincipalPortion).toBe(0);
  });

  it('a payment exceeding interest pays interest first, then splits the remainder across principal', () => {
    // interest due: self=20, peer=60, total=80
    // payment = 280, remainder for principal = 200
    // principal split proportionally: self 1000/3000 * 200 = 66.67, peer 2000/3000 * 200 = 133.33
    const result = allocateRepayment({
      amount: 280,
      selfFundedOutstandingPrincipal: 1000,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 2000,
      peerFundedMonthlyRate: 3,
    });

    expect(result.selfFundedInterestPortion).toBe(20);
    expect(result.peerFundedInterestPortion).toBe(60);
    expect(result.selfFundedPrincipalPortion + result.peerFundedPrincipalPortion).toBe(200);

    const sum =
      result.selfFundedInterestPortion +
      result.peerFundedInterestPortion +
      result.selfFundedPrincipalPortion +
      result.peerFundedPrincipalPortion +
      result.overpaymentRemainder;
    expect(sum).toBeCloseTo(280, 2);
  });

  it('a payment large enough to fully settle both tranches returns the overpayment remainder', () => {
    const result = allocateRepayment({
      amount: 5000,
      selfFundedOutstandingPrincipal: 1000,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 2000,
      peerFundedMonthlyRate: 3,
    });

    expect(result.selfFundedPrincipalPortion).toBe(1000);
    expect(result.peerFundedPrincipalPortion).toBe(2000);
    // 5000 - 80 (interest) - 3000 (principal) = 1920 overpaid
    expect(result.overpaymentRemainder).toBe(1920);
  });

  it('handles a loan with only a self-funded tranche (no peer-funded portion at all)', () => {
    const result = allocateRepayment({
      amount: 100,
      selfFundedOutstandingPrincipal: 500,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 0,
      peerFundedMonthlyRate: 5,
    });

    expect(result.peerFundedInterestPortion).toBe(0);
    expect(result.peerFundedPrincipalPortion).toBe(0);
    expect(result.selfFundedInterestPortion).toBe(10);
    expect(result.selfFundedPrincipalPortion).toBe(90);
  });

  it('handles a zero-interest edge case (both outstanding balances already at zero) without dividing by zero', () => {
    const result = allocateRepayment({
      amount: 50,
      selfFundedOutstandingPrincipal: 0,
      selfFundedMonthlyRate: 2,
      peerFundedOutstandingPrincipal: 0,
      peerFundedMonthlyRate: 3,
    });

    expect(result.overpaymentRemainder).toBe(50);
  });

  it('never produces parts that fail to sum to the original amount, across many random-ish splits', () => {
    const cases = [
      { amount: 137.42, self: 843.19, selfRate: 1.75, peer: 1601.87, peerRate: 4.5 },
      { amount: 999.99, self: 250, selfRate: 3, peer: 750, peerRate: 6.25 },
      { amount: 1.5, self: 10000, selfRate: 2, peer: 5000, peerRate: 3 },
    ];

    for (const c of cases) {
      const result = allocateRepayment({
        amount: c.amount,
        selfFundedOutstandingPrincipal: c.self,
        selfFundedMonthlyRate: c.selfRate,
        peerFundedOutstandingPrincipal: c.peer,
        peerFundedMonthlyRate: c.peerRate,
      });

      const sum =
        result.selfFundedInterestPortion +
        result.peerFundedInterestPortion +
        result.selfFundedPrincipalPortion +
        result.peerFundedPrincipalPortion +
        result.overpaymentRemainder;

      expect(sum).toBeCloseTo(c.amount, 2);
    }
  });
});

describe('allocateAcrossPledges', () => {
  it('splits a peer-funded portion across pledges proportional to their outstanding balance', () => {
    const result = allocateAcrossPledges({
      totalPrincipal: 300,
      totalInterest: 30,
      pledges: [
        { loanPledgeId: 'a', outstandingPrincipal: 1000 },
        { loanPledgeId: 'b', outstandingPrincipal: 2000 },
      ],
    });

    // a has 1/3 of the outstanding balance, b has 2/3
    expect(result[0].principalPortion).toBe(100);
    expect(result[0].interestPortion).toBe(10);
    expect(result[1].principalPortion).toBe(200);
    expect(result[1].interestPortion).toBe(20);
  });

  it('the allocations always sum exactly to the input totals, even with an uneven three-way split', () => {
    const result = allocateAcrossPledges({
      totalPrincipal: 100,
      totalInterest: 10,
      pledges: [
        { loanPledgeId: 'a', outstandingPrincipal: 333.33 },
        { loanPledgeId: 'b', outstandingPrincipal: 333.33 },
        { loanPledgeId: 'c', outstandingPrincipal: 333.34 },
      ],
    });

    const principalSum = result.reduce((sum, r) => sum + r.principalPortion, 0);
    const interestSum = result.reduce((sum, r) => sum + r.interestPortion, 0);

    expect(principalSum).toBeCloseTo(100, 2);
    expect(interestSum).toBeCloseTo(10, 2);
  });

  it('returns an empty array when there are no pledges', () => {
    const result = allocateAcrossPledges({
      totalPrincipal: 100,
      totalInterest: 10,
      pledges: [],
    });

    expect(result).toEqual([]);
  });

  it('gives a single pledge the entire amount', () => {
    const result = allocateAcrossPledges({
      totalPrincipal: 500,
      totalInterest: 25,
      pledges: [{ loanPledgeId: 'only', outstandingPrincipal: 999 }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].principalPortion).toBe(500);
    expect(result[0].interestPortion).toBe(25);
  });
});
