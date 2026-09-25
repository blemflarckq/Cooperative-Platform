import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CycleParticipant } from "../../schemes/entities/cycle-participant.entity";
import { CycleParticipantStatus, OperatingCycleStatus, SchemeStatus } from "../../schemes/enums/scheme.enums";
import { ContributionMode } from "../../schemes/enums/scheme.enums";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { Contribution } from "../../accounting/entities/contribution.entity";
import { ContributionStatus } from "../../accounting/enums/contribution.enums";
import { Loan } from "../../loans/entities/loan.entity";
import { LoanStatus } from "../../loans/enums/loan.enums";
import { computeLoanPayoffAmount } from "../../loans/services/loan-repayment-allocation";
import { RecordedPayment } from "../../payments/entities/recorded-payment.entity";
import { RecordedPaymentStatus } from "../../payments/enums/recorded-payment.enums";
import { getTenantSummaryCounts, TenantSummaryCounts } from "./tenant-summary";

// A streak can only sensibly run as far back as the cycle actually
// started, but OPEN_ENDED cycles carry no start date at all — this caps
// how far back the loop will ever check, purely as a safety bound
// against an unbounded walk backward through time.
const MAX_STREAK_LOOKBACK_MONTHS = 60;

export type LeadMeasureType = "streak" | "project_progress" | "own_total" | "collective_balance";

export interface SchemeLeadMeasure {
  schemeId: string;
  schemeName: string;
  measureType: LeadMeasureType;
  streak?: { completedMonths: number; hasContributedThisMonth: boolean };
  projectProgress?: { raisedAmount: string; targetAmount: string | null; percentage: number | null };
  ownTotal?: { amount: string };
  collectiveBalance?: { amount: string };
}

export interface PersonalActionItem {
  type: "unallocated_payment" | "loan_repayment_due";
  amount: string;
  detail: string;
  relatedId: string;
}

export interface MemberDashboardData {
  schemes: SchemeLeadMeasure[];
  actionItems: PersonalActionItem[];
  tenantSummary: TenantSummaryCounts;
}

/**
 * The lead measure shown per scheme depends on contributionMode, not
 * cycleMode — only MONTHLY_FIXED has a real cadence to measure a streak
 * against, and only PROJECT_TARGET has a real target to show progress
 * toward. VOLUNTARY and EVENT_TRIGGERED schemes genuinely have neither,
 * so forcing a streak or a progress bar onto them would be a fabricated
 * number dressed up as a real one — the same failure mode this whole
 * project has been careful to avoid everywhere else. Each of the four
 * modes gets the measure that's honestly true for it instead.
 */
@Injectable()
export class MemberDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getMemberDashboard(
    tenantId: string,
    tenantUserId: string,
  ): Promise<MemberDashboardData> {
    const [schemes, actionItems, tenantSummary] = await Promise.all([
      this.getSchemeLeadMeasures(tenantId, tenantUserId),
      this.getPersonalActionItems(tenantId, tenantUserId),
      getTenantSummaryCounts(this.dataSource, tenantId),
    ]);

    return { schemes, actionItems, tenantSummary };
  }

  private async getSchemeLeadMeasures(
    tenantId: string,
    tenantUserId: string,
  ): Promise<SchemeLeadMeasure[]> {
    const participations = await this.dataSource.getRepository(CycleParticipant).find({
      where: { tenantId, tenantUserId, status: CycleParticipantStatus.ACTIVE },
      relations: { cycle: { scheme: true } },
    });

    const measures: SchemeLeadMeasure[] = [];

    for (const participation of participations) {
      const cycle = participation.cycle;
      const scheme = cycle?.scheme;

      if (!scheme || scheme.status !== SchemeStatus.ACTIVE) continue;
      if (cycle.status !== OperatingCycleStatus.OPEN) continue;

      switch (scheme.contributionMode) {
        case ContributionMode.MONTHLY_FIXED:
          measures.push(await this.computeStreak(tenantId, tenantUserId, scheme.id, scheme.name, cycle));
          break;
        case ContributionMode.PROJECT_TARGET:
          measures.push(await this.computeProjectProgress(tenantId, scheme.id, scheme.name, cycle));
          break;
        case ContributionMode.VOLUNTARY:
          measures.push(await this.computeOwnTotal(tenantId, tenantUserId, scheme.id, scheme.name, cycle));
          break;
        case ContributionMode.EVENT_TRIGGERED:
          measures.push(await this.computeCollectiveBalance(tenantId, scheme.id, scheme.name, cycle));
          break;
      }
    }

    return measures;
  }

  private async computeStreak(
    tenantId: string,
    tenantUserId: string,
    schemeId: string,
    schemeName: string,
    cycle: OperatingCycle,
  ): Promise<SchemeLeadMeasure> {
    const contributions = await this.dataSource.getRepository(Contribution).find({
      where: { tenantId, tenantUserId, cycleId: cycle.id, status: ContributionStatus.POSTED },
    });

    const contributedMonths = new Set(
      contributions.map((contribution) => contribution.contributionDate.slice(0, 7)),
    );

    const now = new Date();
    const currentMonthKey = this.monthKey(now);
    const hasContributedThisMonth = contributedMonths.has(currentMonthKey);

    // Deliberately starts counting from the month BEFORE now, not the
    // current one — the current, still-open month isn't a "miss" just
    // because it isn't over yet, but it also isn't a completed period to
    // count toward the streak until it's actually been contributed to.
    const cycleStartMonthKey = cycle.startsOn ? cycle.startsOn.slice(0, 7) : null;
    let completedMonths = 0;
    let cursor = this.addMonths(now, -1);

    for (let i = 0; i < MAX_STREAK_LOOKBACK_MONTHS; i++) {
      const cursorKey = this.monthKey(cursor);
      if (cycleStartMonthKey && cursorKey < cycleStartMonthKey) break;
      if (!contributedMonths.has(cursorKey)) break;
      completedMonths++;
      cursor = this.addMonths(cursor, -1);
    }

    return {
      schemeId,
      schemeName,
      measureType: "streak",
      streak: { completedMonths, hasContributedThisMonth },
    };
  }

  private async computeProjectProgress(
    tenantId: string,
    schemeId: string,
    schemeName: string,
    cycle: OperatingCycle,
  ): Promise<SchemeLeadMeasure> {
    const contributions = await this.dataSource.getRepository(Contribution).find({
      where: { tenantId, cycleId: cycle.id, status: ContributionStatus.POSTED },
    });

    const raisedAmount = contributions.reduce(
      (sum, contribution) => sum + Number(contribution.amount),
      0,
    );
    const targetAmount = cycle.targetAmount ? Number(cycle.targetAmount) : null;
    const percentage =
      targetAmount && targetAmount > 0
        ? Math.round((raisedAmount / targetAmount) * 1000) / 10
        : null;

    return {
      schemeId,
      schemeName,
      measureType: "project_progress",
      projectProgress: {
        raisedAmount: raisedAmount.toFixed(2),
        targetAmount: cycle.targetAmount,
        percentage,
      },
    };
  }

  private async computeOwnTotal(
    tenantId: string,
    tenantUserId: string,
    schemeId: string,
    schemeName: string,
    cycle: OperatingCycle,
  ): Promise<SchemeLeadMeasure> {
    const contributions = await this.dataSource.getRepository(Contribution).find({
      where: { tenantId, tenantUserId, cycleId: cycle.id, status: ContributionStatus.POSTED },
    });

    const amount = contributions.reduce((sum, contribution) => sum + Number(contribution.amount), 0);

    return {
      schemeId,
      schemeName,
      measureType: "own_total",
      ownTotal: { amount: amount.toFixed(2) },
    };
  }

  private async computeCollectiveBalance(
    tenantId: string,
    schemeId: string,
    schemeName: string,
    cycle: OperatingCycle,
  ): Promise<SchemeLeadMeasure> {
    const contributions = await this.dataSource.getRepository(Contribution).find({
      where: { tenantId, cycleId: cycle.id, status: ContributionStatus.POSTED },
    });

    const amount = contributions.reduce((sum, contribution) => sum + Number(contribution.amount), 0);

    return {
      schemeId,
      schemeName,
      measureType: "collective_balance",
      collectiveBalance: { amount: amount.toFixed(2) },
    };
  }

  private async getPersonalActionItems(
    tenantId: string,
    tenantUserId: string,
  ): Promise<PersonalActionItem[]> {
    const items: PersonalActionItem[] = [];

    const unallocatedPayments = await this.dataSource.getRepository(RecordedPayment).find({
      where: { tenantId, tenantUserId, status: RecordedPaymentStatus.UNALLOCATED },
      order: { recordedAt: "ASC" },
    });

    for (const payment of unallocatedPayments) {
      items.push({
        type: "unallocated_payment",
        amount: payment.amount,
        detail: "Waiting for you to allocate",
        relatedId: payment.id,
      });
    }

    const loans = await this.dataSource.getRepository(Loan).find({
      where: [
        { tenantId, borrowerTenantUserId: tenantUserId, status: LoanStatus.ACTIVE },
        { tenantId, borrowerTenantUserId: tenantUserId, status: LoanStatus.AT_RISK },
      ],
      relations: { scheme: true },
    });

    for (const loan of loans) {
      const { truePayoffAmount } = computeLoanPayoffAmount({
        selfFundedOutstandingPrincipal: Number(loan.selfFundedOutstandingPrincipal),
        selfFundedMonthlyRate: Number(loan.selfFundedMonthlyRate),
        peerFundedOutstandingPrincipal: Number(loan.peerFundedOutstandingPrincipal),
        peerFundedMonthlyRate: Number(loan.currentPeerMonthlyRate),
      });

      if (truePayoffAmount > 0) {
        items.push({
          type: "loan_repayment_due",
          amount: truePayoffAmount.toFixed(2),
          detail: `${loan.scheme?.name ?? "Loan"} repayment outstanding`,
          relatedId: loan.id,
        });
      }
    }

    return items;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  private addMonths(date: Date, delta: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + delta);
    return result;
  }
}
