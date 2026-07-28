import { AtCapBehavior } from '../enums/loan.enums';
import { computeNextMonthlyRate } from './loan-interest-escalation';
import { describe, expect, it } from '@jest/globals';

describe('computeNextMonthlyRate', () => {
  describe('below the cap', () => {
    it('increases by the configured increment', () => {
      const result = computeNextMonthlyRate({
        currentRate: 5,
        increment: 1,
        capRate: 15,
        atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
      });

      expect(result.nextRate).toBe(6);
      expect(result.shouldFlagAtRisk).toBe(false);
    });

    it('clamps to the cap rather than overshooting it in one step', () => {
      const result = computeNextMonthlyRate({
        currentRate: 14.5,
        increment: 1,
        capRate: 15,
        atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
      });

      expect(result.nextRate).toBe(15);
      expect(result.shouldFlagAtRisk).toBe(false);
    });

    it('reaching the cap exactly on this step does not flag at-risk yet', () => {
      // Flagging only happens on the step where the rate is ALREADY at
      // the cap and would otherwise need to escalate again — not the
      // step where it first arrives at the cap.
      const result = computeNextMonthlyRate({
        currentRate: 14,
        increment: 1,
        capRate: 15,
        atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK,
      });

      expect(result.nextRate).toBe(15);
      expect(result.shouldFlagAtRisk).toBe(false);
    });
  });

  describe('already at the cap', () => {
    it('CONTINUE_AT_CAP keeps the rate at the cap, not flagged', () => {
      const result = computeNextMonthlyRate({
        currentRate: 15,
        increment: 1,
        capRate: 15,
        atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
      });

      expect(result.nextRate).toBe(15);
      expect(result.shouldFlagAtRisk).toBe(false);
    });

    it('FLAG_AND_BLOCK keeps the rate at the cap but flags at-risk', () => {
      const result = computeNextMonthlyRate({
        currentRate: 15,
        increment: 1,
        capRate: 15,
        atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK,
      });

      expect(result.nextRate).toBe(15);
      expect(result.shouldFlagAtRisk).toBe(true);
    });

    it('stays flagged and at cap on every subsequent call under FLAG_AND_BLOCK', () => {
      // Simulates several more months passing after the flag was raised.
      let rate = 15;
      for (let i = 0; i < 3; i++) {
        const result = computeNextMonthlyRate({
          currentRate: rate,
          increment: 1,
          capRate: 15,
          atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK,
        });
        expect(result.nextRate).toBe(15);
        expect(result.shouldFlagAtRisk).toBe(true);
        rate = result.nextRate;
      }
    });
  });

  it('handles a rate that somehow already exceeds the cap defensively', () => {
    // Shouldn't happen in practice, but a policy edit after a loan
    // started could theoretically produce this — treat it the same as
    // "at the cap" rather than escalating further.
    const result = computeNextMonthlyRate({
      currentRate: 20,
      increment: 1,
      capRate: 15,
      atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
    });

    expect(result.nextRate).toBe(15);
  });
});
