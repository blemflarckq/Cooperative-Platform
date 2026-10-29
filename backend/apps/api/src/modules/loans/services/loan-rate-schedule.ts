import { AtCapBehavior, RateScheduleMode } from "../enums/loan.enums";
import { computeNextMonthlyRate } from "./loan-interest-escalation";
import { round2 } from "./loan-tranche-split";

/**
 * Everything the scheduler needs to know about one loan, as plain data —
 * deliberately not the Loan entity, so these rules stay pure and can be
 * tested without a database. Numbers, not the numeric-as-string the
 * entity stores.
 */
export interface LoanRateTerms {
  mode: RateScheduleMode;
  currentRate: number;
  capRate: number;
  atCapBehavior: AtCapBehavior;
  // RAMP
  increment: number;
  /** Where the monthly cadence is measured from (peerRateLastEscalatedAt). */
  rampAnchor: Date | null;
  // PERIODS
  initialRate: number | null;
  laterRate: number | null;
  initialPeriodMonths: number | null;
  laterPeriodMonths: number | null;
  disbursedAt: Date | null;
}

export type RatePhase = "initial" | "later" | "cutoff";

export interface RateUpdatePlan {
  nextRate: number;
  shouldFlagAtRisk: boolean;
  /** RAMP only: where the cadence anchor moves to. null = leave it. */
  nextRampAnchor: Date | null;
  phase?: RatePhase;
  /** Set when the loan can't be scheduled because data is missing. */
  skippedReason?: "missing_disbursement_date" | "missing_schedule" | "missing_anchor";
}

const daysInUtcMonth = (year: number, month0: number) =>
  new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

/** Adds calendar months in UTC, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsClamped(date: Date, months: number): Date {
  const total = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, month));

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/** Whole calendar months fully elapsed between two moments. */
export function completedMonthsBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;

  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());

  if (addMonthsClamped(from, months).getTime() > to.getTime()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function resolveScheduledPhase(
  ageMonths: number,
  initialPeriodMonths: number,
  laterPeriodMonths: number,
): RatePhase {
  if (ageMonths < initialPeriodMonths) return "initial";
  if (ageMonths < initialPeriodMonths + laterPeriodMonths) return "later";
  return "cutoff";
}

/**
 * What this loan's peer-funded rate should be right now, and whether
 * that means flagging it at-risk. Safe to run repeatedly — running it
 * twice in the same moment plans no further change the second time —
 * which is what lets the daily job run on more than one server, or
 * re-run after an outage, without double-applying anything.
 *
 * RAMP catches up: if the job was down for three months it applies three
 * monthly steps, and advances the anchor by exactly three months (not to
 * "now"), so the monthly rhythm stays tied to when the loan was
 * disbursed instead of sliding later each time the job runs late.
 *
 * PERIODS is a pure function of the loan's age: at cut-off the rate is
 * the cap rate, and the scheme's at-cap behaviour decides whether the
 * loan is also flagged.
 */
export function planScheduledRateUpdate(terms: LoanRateTerms, now: Date): RateUpdatePlan {
  const unchanged: RateUpdatePlan = {
    nextRate: terms.currentRate,
    shouldFlagAtRisk: false,
    nextRampAnchor: null,
  };

  if (terms.mode === RateScheduleMode.PERIODS) {
    if (!terms.disbursedAt) return { ...unchanged, skippedReason: "missing_disbursement_date" };

    if (
      terms.initialRate === null ||
      terms.laterRate === null ||
      terms.initialPeriodMonths === null ||
      terms.laterPeriodMonths === null
    ) {
      return { ...unchanged, skippedReason: "missing_schedule" };
    }

    const age = completedMonthsBetween(terms.disbursedAt, now);
    const phase = resolveScheduledPhase(age, terms.initialPeriodMonths, terms.laterPeriodMonths);

    const rate =
      phase === "initial" ? terms.initialRate : phase === "later" ? terms.laterRate : terms.capRate;

    return {
      nextRate: round2(rate),
      shouldFlagAtRisk: phase === "cutoff" && terms.atCapBehavior === AtCapBehavior.FLAG_AND_BLOCK,
      nextRampAnchor: null,
      phase,
    };
  }

  if (!terms.rampAnchor) return { ...unchanged, skippedReason: "missing_anchor" };

  const steps = completedMonthsBetween(terms.rampAnchor, now);
  if (steps === 0) return unchanged;

  let rate = terms.currentRate;
  let shouldFlagAtRisk = false;

  for (let i = 0; i < steps; i++) {
    const result = computeNextMonthlyRate({
      currentRate: rate,
      increment: terms.increment,
      capRate: terms.capRate,
      atCapBehavior: terms.atCapBehavior,
    });
    rate = result.nextRate;
    shouldFlagAtRisk = shouldFlagAtRisk || result.shouldFlagAtRisk;
  }

  return {
    nextRate: rate,
    shouldFlagAtRisk,
    nextRampAnchor: addMonthsClamped(terms.rampAnchor, steps),
  };
}
