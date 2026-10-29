import { AtCapBehavior, RateScheduleMode } from '../enums/loan.enums';
import {
  addMonthsClamped,
  completedMonthsBetween,
  LoanRateTerms,
  planScheduledRateUpdate,
  resolveScheduledPhase,
} from './loan-rate-schedule';

const d = (iso: string) => new Date(iso);

describe('month arithmetic', () => {
  it('clamps to the last day of a shorter month', () => {
    expect(addMonthsClamped(d('2026-01-31T12:00:00Z'), 1).toISOString()).toBe('2026-02-28T12:00:00.000Z');
    expect(addMonthsClamped(d('2028-01-31T12:00:00Z'), 1).toISOString()).toBe('2028-02-29T12:00:00.000Z');
  });

  it('rolls across a year boundary', () => {
    expect(addMonthsClamped(d('2026-11-15T00:00:00Z'), 3).toISOString()).toBe('2027-02-15T00:00:00.000Z');
  });

  it('counts a month as complete only once the full month has passed', () => {
    const from = d('2026-01-15T10:00:00Z');
    expect(completedMonthsBetween(from, d('2026-02-15T09:59:00Z'))).toBe(0);
    expect(completedMonthsBetween(from, d('2026-02-15T10:00:00Z'))).toBe(1);
    expect(completedMonthsBetween(from, d('2026-04-20T00:00:00Z'))).toBe(3);
  });

  it('treats 31 Jan to 28 Feb as one complete month', () => {
    expect(completedMonthsBetween(d('2026-01-31T12:00:00Z'), d('2026-02-28T13:00:00Z'))).toBe(1);
  });

  it('never goes negative', () => {
    expect(completedMonthsBetween(d('2026-05-01T00:00:00Z'), d('2026-01-01T00:00:00Z'))).toBe(0);
  });
});

describe('resolveScheduledPhase', () => {
  it('moves initial -> later -> cutoff on the period boundaries', () => {
    expect(resolveScheduledPhase(0, 3, 3)).toBe('initial');
    expect(resolveScheduledPhase(2, 3, 3)).toBe('initial');
    expect(resolveScheduledPhase(3, 3, 3)).toBe('later');
    expect(resolveScheduledPhase(5, 3, 3)).toBe('later');
    expect(resolveScheduledPhase(6, 3, 3)).toBe('cutoff');
    expect(resolveScheduledPhase(60, 3, 3)).toBe('cutoff');
  });
});

describe('planScheduledRateUpdate — PERIODS', () => {
  const disbursedAt = d('2026-01-10T08:00:00Z');
  const terms = (over: Partial<LoanRateTerms> = {}): LoanRateTerms => ({
    mode: RateScheduleMode.PERIODS,
    currentRate: 5,
    capRate: 12,
    atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
    increment: 0,
    rampAnchor: disbursedAt,
    initialRate: 5,
    laterRate: 8,
    initialPeriodMonths: 3,
    laterPeriodMonths: 3,
    disbursedAt,
    ...over,
  });

  it('applies the initial rate during the initial period', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-03-09T00:00:00Z'));
    expect(plan).toMatchObject({ nextRate: 5, phase: 'initial', shouldFlagAtRisk: false });
  });

  it('steps to the later rate when the initial period ends', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-04-10T08:00:00Z'));
    expect(plan).toMatchObject({ nextRate: 8, phase: 'later' });
  });

  it('applies the cut-off (cap) rate after both periods', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-07-10T08:00:00Z'));
    expect(plan).toMatchObject({ nextRate: 12, phase: 'cutoff', shouldFlagAtRisk: false });
  });

  it('flags at cut-off only when the scheme chose FLAG_AND_BLOCK', () => {
    const plan = planScheduledRateUpdate(
      terms({ atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK }),
      d('2026-07-10T08:00:00Z'),
    );
    expect(plan.shouldFlagAtRisk).toBe(true);
  });

  it('is a pure function of age — running it again changes nothing', () => {
    const now = d('2026-05-01T00:00:00Z');
    const first = planScheduledRateUpdate(terms(), now);
    const second = planScheduledRateUpdate(terms({ currentRate: first.nextRate }), now);
    expect(second.nextRate).toBe(first.nextRate);
  });

  it('skips rather than guesses when the disbursement date is missing', () => {
    const plan = planScheduledRateUpdate(terms({ disbursedAt: null }), d('2026-07-10T00:00:00Z'));
    expect(plan.skippedReason).toBe('missing_disbursement_date');
    expect(plan.nextRate).toBe(5);
  });

  it('skips when the schedule itself is incomplete', () => {
    const plan = planScheduledRateUpdate(terms({ laterRate: null }), d('2026-07-10T00:00:00Z'));
    expect(plan.skippedReason).toBe('missing_schedule');
  });
});

describe('planScheduledRateUpdate — RAMP', () => {
  const anchor = d('2026-01-10T08:00:00Z');
  const terms = (over: Partial<LoanRateTerms> = {}): LoanRateTerms => ({
    mode: RateScheduleMode.RAMP,
    currentRate: 5,
    capRate: 8,
    atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
    increment: 1,
    rampAnchor: anchor,
    initialRate: null,
    laterRate: null,
    initialPeriodMonths: null,
    laterPeriodMonths: null,
    disbursedAt: null,
    ...over,
  });

  it('does nothing before a full month has passed', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-02-09T00:00:00Z'));
    expect(plan).toMatchObject({ nextRate: 5, nextRampAnchor: null });
  });

  it('applies one step after a month and advances the anchor by exactly one month', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-02-12T00:00:00Z'));
    expect(plan.nextRate).toBe(6);
    expect(plan.nextRampAnchor?.toISOString()).toBe('2026-02-10T08:00:00.000Z');
  });

  it('catches up every missed month, and keeps the anchor on the original rhythm', () => {
    const plan = planScheduledRateUpdate(terms(), d('2026-04-25T00:00:00Z'));
    expect(plan.nextRate).toBe(8); // 6, 7, 8 — clamped at the cap
    expect(plan.nextRampAnchor?.toISOString()).toBe('2026-04-10T08:00:00.000Z'); // not "now"
  });

  it('flags when it is already at the cap and the scheme says FLAG_AND_BLOCK', () => {
    const plan = planScheduledRateUpdate(
      terms({ currentRate: 8, atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK }),
      d('2026-02-12T00:00:00Z'),
    );
    expect(plan).toMatchObject({ nextRate: 8, shouldFlagAtRisk: true });
  });

  it('keeps going at the cap without flagging under CONTINUE_AT_CAP', () => {
    const plan = planScheduledRateUpdate(terms({ currentRate: 8 }), d('2026-06-12T00:00:00Z'));
    expect(plan).toMatchObject({ nextRate: 8, shouldFlagAtRisk: false });
  });

  it('skips when there is no anchor to measure the cadence from', () => {
    const plan = planScheduledRateUpdate(terms({ rampAnchor: null }), d('2026-06-12T00:00:00Z'));
    expect(plan.skippedReason).toBe('missing_anchor');
  });
});
