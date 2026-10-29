import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanStatus, RateScheduleMode } from "../enums/loan.enums";
import { LoanRateTerms, planScheduledRateUpdate, RateUpdatePlan } from "./loan-rate-schedule";

export function toLoanRateTerms(loan: Loan): LoanRateTerms {
  const numberOrNull = (value: string | null | undefined) =>
    value === null || value === undefined ? null : Number(value);

  return {
    mode: loan.rateScheduleMode,
    currentRate: Number(loan.currentPeerMonthlyRate),
    capRate: Number(loan.peerCapRate),
    atCapBehavior: loan.atCapBehavior,
    increment: Number(loan.peerMonthlyRateIncrement),
    rampAnchor: loan.peerRateLastEscalatedAt,
    initialRate: numberOrNull(loan.peerInitialMonthlyRate),
    laterRate: numberOrNull(loan.peerLaterMonthlyRate),
    initialPeriodMonths: loan.initialPeriodMonths,
    laterPeriodMonths: loan.laterPeriodMonths,
    disbursedAt: loan.disbursedAt,
  };
}

/**
 * Flags a loan at-risk, recording WHEN only the first time. The existing
 * manual escalation used to re-stamp this every time it was called on an
 * already-flagged loan, which silently reset "how long has this been at
 * risk" — the very number the admin dashboard's oldest-case figure reads.
 */
export function flagLoanAtRisk(loan: Loan, now: Date): void {
  if (!loan.isAtRiskFlagged) {
    loan.isAtRiskFlagged = true;
    loan.flaggedAtRiskAt = now;
  }
  loan.status = LoanStatus.AT_RISK;
}

export function applyRatePlanToLoan(
  loan: Loan,
  plan: RateUpdatePlan,
  now: Date,
): { rateChanged: boolean; newlyFlagged: boolean; anchorMoved: boolean } {
  const rateChanged =
    plan.nextRate.toFixed(2) !== Number(loan.currentPeerMonthlyRate).toFixed(2);
  const newlyFlagged = plan.shouldFlagAtRisk && !loan.isAtRiskFlagged;
  const anchorMoved = plan.nextRampAnchor !== null;

  if (rateChanged) {
    loan.currentPeerMonthlyRate = plan.nextRate.toFixed(2);
    if (loan.rateScheduleMode === RateScheduleMode.PERIODS) {
      loan.peerRateLastEscalatedAt = now;
    }
  }

  if (plan.nextRampAnchor) {
    loan.peerRateLastEscalatedAt = plan.nextRampAnchor;
  }

  if (newlyFlagged) {
    flagLoanAtRisk(loan, now);
  }

  return { rateChanged, newlyFlagged, anchorMoved };
}

export interface RateScheduleRunSummary {
  examined: number;
  changed: number;
  newlyFlagged: number;
  skipped: number;
  failed: number;
}

/**
 * Brings every live loan's peer-funded rate up to date with its own
 * schedule. Run daily by LoanRateScheduleTask, and safe to run again at
 * any time: each loan is re-evaluated under its own row lock, so a
 * second server, a retry after an outage, or a manual re-run all find
 * nothing left to do rather than applying anything twice.
 *
 * One loan failing never stops the rest.
 */
@Injectable()
export class LoanRateScheduleService {
  private readonly logger = new Logger(LoanRateScheduleService.name);

  constructor(private readonly dataSource: DataSource) {}

  async applyDueRates(now: Date = new Date()): Promise<RateScheduleRunSummary> {
    const candidates = await this.dataSource.getRepository(Loan).find({
      where: [{ status: LoanStatus.ACTIVE }, { status: LoanStatus.AT_RISK }],
      select: { id: true },
    });

    const summary: RateScheduleRunSummary = {
      examined: candidates.length,
      changed: 0,
      newlyFlagged: 0,
      skipped: 0,
      failed: 0,
    };

    for (const { id } of candidates) {
      try {
        const outcome = await this.applyToLoan(id, now);
        if (outcome === "skipped") summary.skipped += 1;
        if (outcome === "changed" || outcome === "flagged") summary.changed += 1;
        if (outcome === "flagged") summary.newlyFlagged += 1;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(`Rate schedule failed for loan ${id}: ${(error as Error).message}`);
      }
    }

    return summary;
  }

  private async applyToLoan(
    loanId: string,
    now: Date,
  ): Promise<"unchanged" | "changed" | "flagged" | "skipped"> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the loan alone — no relations — so repayments, which also
      // lock it, can't interleave with a rate change mid-calculation.
      const loan = await manager.findOne(Loan, {
        where: { id: loanId },
        lock: { mode: "pessimistic_write" },
      });

      // It may have been repaid between the candidate query and now.
      if (!loan || (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.AT_RISK)) {
        return "unchanged";
      }

      if (Number(loan.peerFundedOutstandingPrincipal) <= 0) {
        return "unchanged"; // nothing left on the tranche this rate applies to
      }

      const plan = planScheduledRateUpdate(toLoanRateTerms(loan), now);

      if (plan.skippedReason) {
        this.logger.warn(`Loan ${loan.id} not scheduled: ${plan.skippedReason}`);
        return "skipped";
      }

      const result = applyRatePlanToLoan(loan, plan, now);

      if (!result.rateChanged && !result.newlyFlagged && !result.anchorMoved) {
        return "unchanged";
      }

      await manager.save(Loan, loan);
      return result.newlyFlagged ? "flagged" : "changed";
    });
  }
}
