import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Loan } from "../../loans/entities/loan.entity";
import { LoanStatus } from "../../loans/enums/loan.enums";
import { OutboundRequest } from "../../schemes/entities/outbound-request.entity";
import { OutboundRequestStatus } from "../../schemes/enums/governance.enums";
import { getTenantSummaryCounts } from "./tenant-summary";

const APPROVAL_AGING_THRESHOLD_DAYS = 3;

export interface AdminDashboardData {
  activeMemberCount: number;
  activeSchemeCount: number;
  loanPortfolio: {
    totalOutstanding: string;
    atRiskAmount: string;
    /** null when totalOutstanding is zero — there's no meaningful
     * percentage of nothing, and showing 0% would misleadingly imply
     * a healthy portfolio rather than an empty one. */
    atRiskPercentage: number | null;
    /** null when there are no at-risk loans, or when every at-risk
     * loan predates the flaggedAtRiskAt field being added — an honest
     * gap, not fabricated as zero. */
    oldestAtRiskDays: number | null;
  };
  approvals: {
    pendingOverThresholdCount: number;
    thresholdDays: number;
    /** null when nothing is pending at all. */
    longestPendingDays: number | null;
  };
}

/**
 * Deliberately built with plain DataSource queries rather than pulling
 * in every module these entities live in — this service only reads,
 * across schemes/loans/tenant-users/outbound-requests, and doesn't need
 * the full module graph those write-paths depend on. Same pattern
 * PaymentAllocationService already established for this kind of
 * cross-cutting aggregation.
 */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getAdminDashboard(tenantId: string): Promise<AdminDashboardData> {
    const [{ activeMemberCount, activeSchemeCount }, loanPortfolio, approvals] =
      await Promise.all([
        getTenantSummaryCounts(this.dataSource, tenantId),
        this.getLoanPortfolioHealth(tenantId),
        this.getApprovalAging(tenantId),
      ]);

    return { activeMemberCount, activeSchemeCount, loanPortfolio, approvals };
  }

  private async getLoanPortfolioHealth(
    tenantId: string,
  ): Promise<AdminDashboardData["loanPortfolio"]> {
    const loans = await this.dataSource.getRepository(Loan).find({
      where: [
        { tenantId, status: LoanStatus.ACTIVE },
        { tenantId, status: LoanStatus.AT_RISK },
      ],
    });

    const outstandingOf = (loan: Loan) =>
      Number(loan.selfFundedOutstandingPrincipal) + Number(loan.peerFundedOutstandingPrincipal);

    const totalOutstanding = loans.reduce((sum, loan) => sum + outstandingOf(loan), 0);

    const atRiskLoans = loans.filter((loan) => loan.status === LoanStatus.AT_RISK);
    const atRiskAmount = atRiskLoans.reduce((sum, loan) => sum + outstandingOf(loan), 0);

    const atRiskPercentage =
      totalOutstanding > 0 ? Math.round((atRiskAmount / totalOutstanding) * 1000) / 10 : null;

    const flaggedTimestamps = atRiskLoans
      .map((loan) => loan.flaggedAtRiskAt)
      .filter((date): date is Date => date !== null);

    const oldestAtRiskDays =
      flaggedTimestamps.length > 0
        ? Math.floor(
            (Date.now() - Math.min(...flaggedTimestamps.map((d) => d.getTime()))) /
              (1000 * 60 * 60 * 24),
          )
        : null;

    return {
      totalOutstanding: totalOutstanding.toFixed(2),
      atRiskAmount: atRiskAmount.toFixed(2),
      atRiskPercentage,
      oldestAtRiskDays,
    };
  }

  private async getApprovalAging(
    tenantId: string,
  ): Promise<AdminDashboardData["approvals"]> {
    const pending = await this.dataSource.getRepository(OutboundRequest).find({
      where: { tenantId, status: OutboundRequestStatus.INITIATED },
    });

    if (pending.length === 0) {
      return {
        pendingOverThresholdCount: 0,
        thresholdDays: APPROVAL_AGING_THRESHOLD_DAYS,
        longestPendingDays: null,
      };
    }

    const daysPending = pending.map(
      (request) =>
        Math.floor((Date.now() - request.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      pendingOverThresholdCount: daysPending.filter(
        (days) => days >= APPROVAL_AGING_THRESHOLD_DAYS,
      ).length,
      thresholdDays: APPROVAL_AGING_THRESHOLD_DAYS,
      longestPendingDays: Math.max(...daysPending),
    };
  }
}
