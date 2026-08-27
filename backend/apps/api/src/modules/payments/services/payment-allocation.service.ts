import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { TenantUserRole } from "../../identity/entities/tenant-user-role.entity";
import { Loan } from "../../loans/entities/loan.entity";
import { LoanStatus } from "../../loans/enums/loan.enums";
import { CycleParticipant } from "../../schemes/entities/cycle-participant.entity";
import { CycleParticipantStatus, OperatingCycleStatus } from "../../schemes/enums/scheme.enums";
import { ContributionSource } from "../../accounting/enums/contribution.enums";
import { RecordedPayment } from "../entities/recorded-payment.entity";
import { RecordedPaymentStatus } from "../enums/recorded-payment.enums";
import { LoanRepaymentsService } from "../../loans/services/loan-repayments.service";
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

export interface RecordPaymentInput {
  tenantUserId: string;
  amount: string;
  notes?: string;
}

export interface AllocatePaymentInput {
  loanAllocations: { loanId: string; amount: string }[];
  remainder?: { cycleId: string; amount: string };
}

export interface AllocatePaymentResult {
  loansRepaid: { loanId: string; amount: string }[];
  remainderRecorded: { cycleId: string; amount: string } | null;
}

// Platform roles allowed to record a payment on someone's behalf, and to
// assist with someone else's allocation. Deliberately role-CODE based
// rather than re-deriving the full permission-resolution machinery here —
// simple, explicit, and auditable. "Committee member" isn't a platform
// role (it's a per-scheme governance role, checked separately by the
// approval engine) — by this codebase's existing convention, committee
// members hold the "treasurer" platform role, which is already covered.
const STAFF_ROLE_CODES = ["tenant_admin", "treasurer", "secretary"];

@Injectable()
export class PaymentAllocationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loanRepaymentsService: LoanRepaymentsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  /**
   * Step 1 — staff only. Captures the fact that money arrived, with no
   * decision yet made about where it goes. Complete and standalone: the
   * payer sees this the next time they log in and can act on it whenever
   * they're ready, there's no time pressure baked into recording it.
   */
  async recordPayment(
    tenantId: string,
    input: RecordPaymentInput,
    actorUserId: string,
  ): Promise<RecordedPayment> {
    if (!(Number(input.amount) > 0)) {
      throw new BadRequestException("amount must be greater than zero.");
    }

    return this.dataSource.transaction(async (manager) => {
      const actor = await this.resolveActiveTenantUser(manager, tenantId, actorUserId);
      await this.assertIsStaff(manager, tenantId, actor.id, "record a payment");

      const payer = await manager.findOne(TenantUser, {
        where: { id: input.tenantUserId, tenantId, isActive: true },
      });
      if (!payer) {
        throw new BadRequestException(
          "Payer is invalid, inactive, or does not belong to this tenant.",
        );
      }

      const payment = manager.create(RecordedPayment, {
        tenantId,
        tenantUserId: input.tenantUserId,
        amount: Number(input.amount).toFixed(2),
        recordedByTenantUserId: actor.id,
        recordedAt: new Date(),
        status: RecordedPaymentStatus.UNALLOCATED,
        notes: input.notes?.trim() || null,
      });

      return manager.save(RecordedPayment, payment);
    });
  }

  async getUnallocatedPayments(
    tenantId: string,
    tenantUserId: string,
  ): Promise<RecordedPayment[]> {
    return this.dataSource.getRepository(RecordedPayment).find({
      where: { tenantId, tenantUserId, status: RecordedPaymentStatus.UNALLOCATED },
      order: { recordedAt: "ASC" },
    });
  }

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

  /**
   * Step 2 — primarily the payer's own action. Staff can also call this
   * on someone's behalf (the secondary "assist" path required by the
   * product), but only if they hold a staff role — self-allocation
   * always works regardless of role, since everyone should be able to
   * manage their own money.
   */
  async allocatePayment(
    tenantId: string,
    recordedPaymentId: string,
    input: AllocatePaymentInput,
    actorUserId: string,
  ): Promise<AllocatePaymentResult> {
    return this.dataSource.transaction(async (manager) => {
      const actor = await this.resolveActiveTenantUser(manager, tenantId, actorUserId);

      const payment = await manager.findOne(RecordedPayment, {
        where: { id: recordedPaymentId, tenantId },
        lock: { mode: "pessimistic_write" },
      });

      if (!payment) {
        throw new NotFoundException("Recorded payment not found.");
      }

      if (payment.status !== RecordedPaymentStatus.UNALLOCATED) {
        throw new BadRequestException("This payment has already been allocated.");
      }

      const isOwnPayment = payment.tenantUserId === actor.id;
      if (!isOwnPayment) {
        await this.assertIsStaff(manager, tenantId, actor.id, "allocate this on someone else's behalf");
      }

      this.validateAllocation(payment.amount, input);

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
            tenantUserId: payment.tenantUserId,
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

      payment.status = RecordedPaymentStatus.ALLOCATED;
      payment.allocatedAt = new Date();
      payment.allocatedByTenantUserId = actor.id;
      await manager.save(RecordedPayment, payment);

      return { loansRepaid, remainderRecorded };
    });
  }

  private async resolveActiveTenantUser(
    manager: EntityManager,
    tenantId: string,
    actorUserId: string,
  ): Promise<TenantUser> {
    const actor = await manager.findOne(TenantUser, {
      where: { tenantId, userId: actorUserId, isActive: true, status: "active" },
    });

    if (!actor) {
      throw new ForbiddenException("Acting user is not an active member of this tenant.");
    }

    return actor;
  }

  private async assertIsStaff(
    manager: EntityManager,
    tenantId: string,
    tenantUserId: string,
    actionDescription: string,
  ): Promise<void> {
    const roleAssignments = await manager.find(TenantUserRole, {
      where: { tenantUserId },
      relations: { role: true },
    });

    const isStaff = roleAssignments.some(
      (assignment) =>
        assignment.role?.tenantId === tenantId &&
        STAFF_ROLE_CODES.includes(assignment.role.code),
    );

    if (!isStaff) {
      throw new ForbiddenException(
        `Only an admin, treasurer, or secretary can ${actionDescription}.`,
      );
    }
  }

  private validateAllocation(paymentAmount: string, input: AllocatePaymentInput): void {
    const total = Number(paymentAmount);

    const allocatedToLoans = input.loanAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.amount),
      0,
    );
    const remainderAmount = input.remainder ? Number(input.remainder.amount) : 0;
    const allocatedTotal = Math.round((allocatedToLoans + remainderAmount) * 100) / 100;
    const roundedTotal = Math.round(total * 100) / 100;

    if (allocatedTotal !== roundedTotal) {
      throw new BadRequestException(
        `Allocated amounts (${allocatedTotal.toFixed(2)}) must add up to the payment amount (${roundedTotal.toFixed(2)}).`,
      );
    }
  }
}
