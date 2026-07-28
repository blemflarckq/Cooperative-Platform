import { BadRequestException } from '@nestjs/common';
import { splitLoanIntoTranches, round2 } from './loan-tranche-split';
import { describe, expect, it } from '@jest/globals';

describe('splitLoanIntoTranches', () => {
  it('is fully self-funded when the requested amount is fully covered by contributions', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 500,
      borrowerContributionBalance: 1000,
    });

    expect(result.selfFundedPrincipal).toBe(500);
    expect(result.peerFundedPrincipal).toBe(0);
  });

  it('is fully self-funded when the requested amount exactly equals the contribution balance', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 500,
      borrowerContributionBalance: 500,
    });

    expect(result.selfFundedPrincipal).toBe(500);
    expect(result.peerFundedPrincipal).toBe(0);
  });

  it('is fully peer-funded when the borrower has no contributions', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 500,
      borrowerContributionBalance: 0,
    });

    expect(result.selfFundedPrincipal).toBe(0);
    expect(result.peerFundedPrincipal).toBe(500);
  });

  it('splits across both tranches when the request exceeds contributions', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 800,
      borrowerContributionBalance: 300,
    });

    expect(result.selfFundedPrincipal).toBe(300);
    expect(result.peerFundedPrincipal).toBe(500);
  });

  it('the two tranches always sum back to the requested amount', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 1234.56,
      borrowerContributionBalance: 400.11,
    });

    expect(
      round2(result.selfFundedPrincipal + result.peerFundedPrincipal),
    ).toBe(1234.56);
  });

  it('treats a negative contribution balance as zero rather than erroring', () => {
    const result = splitLoanIntoTranches({
      requestedAmount: 200,
      borrowerContributionBalance: -50,
    });

    expect(result.selfFundedPrincipal).toBe(0);
    expect(result.peerFundedPrincipal).toBe(200);
  });

  it('rejects a zero requested amount', () => {
    expect(() =>
      splitLoanIntoTranches({ requestedAmount: 0, borrowerContributionBalance: 100 }),
    ).toThrow(BadRequestException);
  });

  it('rejects a negative requested amount', () => {
    expect(() =>
      splitLoanIntoTranches({ requestedAmount: -100, borrowerContributionBalance: 100 }),
    ).toThrow(BadRequestException);
  });
});
