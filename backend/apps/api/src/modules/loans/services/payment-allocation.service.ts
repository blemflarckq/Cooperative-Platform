import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { Loan } from "../entities/loan.entity";
import { LoanStatus } from "../enums/loan.enums";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { CycleParticipant } from "../../schemes/entities/cycle-participant.entity";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { CycleParticipantStatus, OperatingCycleStatus } from "../../schemes/enums/scheme.enums";
import { ContributionSource } from "../../accounting/enums/contribution.enums";
import { LoanRepaymentsService } from "./loan-repayments.service";
import { ContributionsService } from "../../accounting/services/contributions.service";

export interface OutstandingLoanObligation {
  loanId: string;
  schemeId: string;
  schemeName: string;
  isAtRiskFlagged: boolean;
  currentRate: string;
  payoffAmount: string;
}

export interface RemainderTarget {
  cycleId: string;
  schemeId: string;
  schemeName: string;
}

export interface OutstandingObligations {
  loans: OutstandingLoanObligation[];
  remainderTargets: RemainderTarget[];
}

export interface AllocatePaymentInput {
  totalAmount: string;
  loanAllocations: { loanId: string; amount: string }[];
  remainder?: { cycleId: string; amount: string };
}

export interface AllocatePaymentResult {
  loansRepaid: { loanId: string; amount: string }[];
  remainderRecorded: { cycleId: string; amount: string } | null;
}

/**
 * The core of the "record a payment" flow: given one lump sum from a
 * payer with no meaningful reference (the normal case for mobile money —
 * a phone number and an amount, nothing more), figures out how it should
 * be split across that payer's real outstanding obligations, and applies
 * the whole split as ONE atomic operation.
 *
 * Deliberately loans-only for ranking, for now — contribution "arrears"
 * (an expected recurring amount, overdue by how much) isn't modeled
 * anywhere in this codebase yet, so it can't be honestly prioritized.
 * Extending this once that concept exists is the natural next step, not
 * something to fake here.
 */
@Injectable()
export class PaymentAllocationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loanRepaymentsService: LoanRepaymentsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  async getOutstandingObligations(
    tenantId: string,
    tenantUserId: string,
  ): Promise<OutstandingObligations> {
    const tenantUser = await this.dataSource.getRepository(TenantUser).findOne({
      where: { id: tenantUserId, tenantId },
    });

    if (!tenantUser) {
      throw new NotFoundException("Tenant user not found.");
    }

    const loans = await this.dataSource.getRepository(Loan).find({
      where: [
        { tenantId, borrowerTenantUserId: tenantUserId, status: LoanStatus.ACTIVE },
        { tenantId, borrowerTenantUserId: tenantUserId, status: LoanStatus.AT_RISK },
      ],
      relations: { scheme: true },
    });

    const loanObligations: OutstandingLoanObligation[] = loans.map((loan) => {
      const selfInterestDue =
        Math.round(
          Number(loan.selfFundedOutstandingPrincipal) *
            (Number(loan.selfFundedMonthlyRate) / 100) *
            100,
        ) / 100;
      const peerInterestDue =
        Math.round(
          Number(loan.peerFundedOutstandingPrincipal) *
            (Number(loan.currentPeerMonthlyRate) / 100) *
            100,
        ) / 100;
      const payoffAmount =
        Math.round(
          (Number(loan.selfFundedOutstandingPrincipal) +
            Number(loan.peerFundedOutstandingPrincipal) +
            selfInterestDue +
            peerInterestDue) *
            100,
        ) / 100;

      // Whichever tranche's rate is actually "live" for this loan right
      // now — a fully self-funded loan's peer rate isn't meaningful, and
      // vice versa. Used purely for priority ordering below.
      const activeRate =
        Number(loan.peerFundedOutstandingPrincipal) > 0
          ? Number(loan.currentPeerMonthlyRate)
          : Number(loan.selfFundedMonthlyRate);

      return {
        loanId: loan.id,
        schemeId: loan.schemeId,
        schemeName: loan.scheme?.name ?? "Unknown scheme",
        isAtRiskFlagged: loan.isAtRiskFlagged,
        currentRate: activeRate.toFixed(2),
        payoffAmount: payoffAmount.toFixed(2),
      };
    });

    // At-risk first (most urgent — actively blocking new credit), then
    // highest active rate first (minimizes what the group loses to
    // escalating peer-funded interest the longer it sits unpaid).
    loanObligations.sort((a, b) => {
      if (a.isAtRiskFlagged !== b.isAtRiskFlagged) {
        return a.isAtRiskFlagged ? -1 : 1;
      }
      return Number(b.currentRate) - Number(a.currentRate);
    });

    const participations = await this.dataSource.getRepository(CycleParticipant).find({
      where: { tenantId, tenantUserId, status: CycleParticipantStatus.ACTIVE },
      relations: { cycle: { scheme: true } },
    });

    const remainderTargets: RemainderTarget[] = participations
      .filter((participation) => participation.cycle?.status === OperatingCycleStatus.OPEN)
      .map((participation) => ({
        cycleId: participation.cycleId,
        schemeId: participation.cycle.schemeId,
        schemeName: participation.cycle.scheme?.name ?? "Unknown scheme",
      }));

    return { loans: loanObligations, remainderTargets };
  }

  async allocatePayment(
    tenantId: string,
    tenantUserId: string,
    input: AllocatePaymentInput,
    actorUserId: string,
  ): Promise<AllocatePaymentResult> {
    this.validateAllocation(input);

    return this.dataSource.transaction(async (manager) => {
      const tenantUser = await manager.findOne(TenantUser, {
        where: { id: tenantUserId, tenantId },
      });

      if (!tenantUser) {
        throw new NotFoundException("Tenant user not found.");
      }

      const loansRepaid: { loanId: string; amount: string }[] = [];

      for (const allocation of input.loanAllocations) {
        await this.loanRepaymentsService.recordRepayment(
          tenantId,
          allocation.loanId,
          allocation.amount,
          actorUserId,
          manager,
        );
        loansRepaid.push(allocation);
      }

      let remainderRecorded: { cycleId: string; amount: string } | null = null;

      if (input.remainder && Number(input.remainder.amount) > 0) {
        await this.contributionsService.createForCycle(
          tenantId,
          input.remainder.cycleId,
          {
            tenantUserId,
            contributionDate: new Date().toISOString().slice(0, 10),
            amount: input.remainder.amount,
            source: ContributionSource.MOBILE_MONEY,
            notes: "Recorded via payment allocation",
          },
          actorUserId,
          manager,
        );
        remainderRecorded = input.remainder;
      }

      return { loansRepaid, remainderRecorded };
    });
  }

  private validateAllocation(input: AllocatePaymentInput): void {
    const total = Number(input.totalAmount);
    if (!(total > 0)) {
      throw new BadRequestException("totalAmount must be greater than zero.");
    }

    const allocatedToLoans = input.loanAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.amount),
      0,
    );
    const remainderAmount = input.remainder ? Number(input.remainder.amount) : 0;
    const allocatedTotal = Math.round((allocatedToLoans + remainderAmount) * 100) / 100;
    const roundedTotal = Math.round(total * 100) / 100;

    if (allocatedTotal !== roundedTotal) {
      throw new BadRequestException(
        `Allocated amounts (${allocatedTotal.toFixed(2)}) must add up to the total received (${roundedTotal.toFixed(2)}).`,
      );
    }
  }
}
