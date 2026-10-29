import { BadRequestException } from '@nestjs/common';
import { AtCapBehavior, RateScheduleMode } from '../enums/loan.enums';
import { LoanPolicyService, UpsertLoanPolicyInput } from './loan-policy.service';

// validateInput is the rule set a treasurer's input passes through; it
// needs no database, so it's tested directly.
const service = new LoanPolicyService(null as never, null as never);
const validate = (input: UpsertLoanPolicyInput) =>
  (service as unknown as { validateInput(i: UpsertLoanPolicyInput): void }).validateInput(input);

const ramp: UpsertLoanPolicyInput = {
  selfFundedMonthlyRate: '2.00',
  peerBaseMonthlyRate: '5.00',
  peerMonthlyRateIncrement: '1.00',
  peerCapRate: '12.00',
  atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
};
const periods: UpsertLoanPolicyInput = {
  ...ramp,
  peerMonthlyRateIncrement: '0.00',
  rateScheduleMode: RateScheduleMode.PERIODS,
  initialPeriodMonths: 3,
  laterPeriodMonths: 3,
  peerLaterMonthlyRate: '8.00',
};

describe('loan policy validation', () => {
  it('still accepts the original input with none of the new fields (existing clients keep working)', () => {
    expect(() => validate(ramp)).not.toThrow();
  });

  it('accepts a valid three-period schedule', () => {
    expect(() => validate(periods)).not.toThrow();
  });

  it('accepts a flat schedule where the rates are equal', () => {
    expect(() => validate({ ...periods, peerLaterMonthlyRate: '5.00' })).not.toThrow();
    expect(() => validate({ ...periods, peerLaterMonthlyRate: '12.00' })).not.toThrow();
  });

  it('rejects a periods schedule with no period lengths', () => {
    expect(() => validate({ ...periods, initialPeriodMonths: undefined })).toThrow(BadRequestException);
    expect(() => validate({ ...periods, laterPeriodMonths: undefined })).toThrow(BadRequestException);
  });

  it('rejects zero, negative or fractional month counts', () => {
    expect(() => validate({ ...periods, initialPeriodMonths: 0 })).toThrow(BadRequestException);
    expect(() => validate({ ...periods, laterPeriodMonths: -2 })).toThrow(BadRequestException);
    expect(() => validate({ ...periods, initialPeriodMonths: 2.5 })).toThrow(BadRequestException);
  });

  it('rejects a periods schedule with no later rate', () => {
    expect(() => validate({ ...periods, peerLaterMonthlyRate: undefined })).toThrow(BadRequestException);
  });

  it('rejects a later rate that is lower than the initial rate (almost certainly swapped)', () => {
    expect(() => validate({ ...periods, peerLaterMonthlyRate: '3.00' })).toThrow(/rise as a loan ages/);
  });

  it('rejects a later rate above the cut-off rate', () => {
    expect(() => validate({ ...periods, peerLaterMonthlyRate: '15.00' })).toThrow(/rise as a loan ages/);
  });

  it('ignores the period fields entirely in RAMP mode', () => {
    expect(() => validate({ ...ramp, rateScheduleMode: RateScheduleMode.RAMP, laterPeriodMonths: -9 })).not.toThrow();
  });
});
