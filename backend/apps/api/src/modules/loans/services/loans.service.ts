import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanPolicy } from "../entities/loan-policy.entity";
import { LoanPledge } from "../entities/loan-pledge.entity";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { LoanStatus } from "../enums/loan.enums";
import { OutboundRequestType } from "../../schemes/enums/governance.enums";
import { splitLoanIntoTranches } from "./loan-tranche-split";
import { MemberBalanceService } from "./member-balance.service";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";
import { OutboundRequestsService } from "../../schemes/services/outbound-requests.service";

export interface RequestLoanInput {
  amount: string;
  purpose: string;
}

@Injectable()
export class LoansService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
    private readonly memberBalanceService: MemberBalanceService,
    private readonly outboundRequestsService: OutboundRequestsService,
  ) {}

  async findOne(tenantId: string, loanId: string): Promise<Loan> {
    const loan = await this.dataSource.getRepository(Loan).findOne({
      where: { id: loanId, tenantId },
      relations: { pledges: { pledgingTenantUser: { user: true } }, borrower: { user: true } },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found.");
    }

    return loan;
  }

  async findAllForScheme(tenantId: string, schemeId: string): Promise<Loan[]> {
    return this.dataSource.getRepository(Loan).find({
      where: { tenantId, schemeId },
      relations: { pledges: true },
      order: { createdAt: "DESC" },
    });
  }

  async findAllForCycle(tenantId: string, cycleId: string): Promise<Loan[]> {
    return this.dataSource.getRepository(Loan).find({
      where: { tenantId, cycleId },
      relations: { pledges: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Requests a new loan for the acting user (the borrower requests their
   * own loan — this is not an admin-on-behalf-of-someone-else flow). The
   * request automatically splits into self-funded and peer-funded
   * tranches; if there's no peer-funded excess at all, the loan skips
   * straight to PENDING_APPROVAL and an OutboundRequest is created
   * immediately — the "auto-approved" self-funded tranche only means the
   * credit decision is automatic, real money still requires the standard
   * 2-approver sign-off before it can leave the account, same as any
   * other withdrawal.
   */
  async requestLoan(
    tenantId: string,
    cycleId: string,
    input: RequestLoanInput,
    actorUserId: string,
  ): Promise<Loan> {
    if (!(Number(input.amount) > 0)) {
      throw new BadRequestException("amount must be greater than zero.");
    }

    if (!input.purpose?.trim()) {
      throw new BadRequestException("purpose is required.");
    }

    return this.dataSource.transaction(async (manager) => {
      const borrower = await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const cycle = await manager.findOne(OperatingCycle, {
        where: { id: cycleId, tenantId },
      });
      if (!cycle) {
        throw new NotFoundException("Operating cycle not found.");
      }

      const schemeId = cycle.schemeId;

      const policy = await manager.findOne(LoanPolicy, {
        where: { tenantId, schemeId },
      });
      if (!policy) {
        throw new BadRequestException(
          "This scheme has no loan policy configured yet — set one up before requesting a loan.",
        );
      }

      const existingActiveLoan = await manager.findOne(Loan, {
        where: {
          tenantId,
          schemeId,
          borrowerTenantUserId: borrower.id,
        },
      });

      if (existingActiveLoan?.isAtRiskFlagged) {
        throw new BadRequestException(
          "You have an existing loan flagged at-risk in this scheme and cannot take a new loan until it is fully repaid.",
        );
      }

      const availableSelfFunding =
        await this.memberBalanceService.getAvailableSelfFundingCapacity(
          manager,
          tenantId,
          cycleId,
          borrower.id,
        );

      const requestedAmount = Number(input.amount);
      const { selfFundedPrincipal, peerFundedPrincipal } = splitLoanIntoTranches({
        requestedAmount,
        borrowerContributionBalance: availableSelfFunding,
      });

      const isFullyPledgedAlready = peerFundedPrincipal === 0;

      const loan = manager.create(Loan, {
        tenantId,
        schemeId,
        cycleId,
        borrowerTenantUserId: borrower.id,
        principalAmount: requestedAmount.toFixed(2),
        selfFundedPrincipal: selfFundedPrincipal.toFixed(2),
        selfFundedOutstandingPrincipal: selfFundedPrincipal.toFixed(2),
        selfFundedMonthlyRate: policy.selfFundedMonthlyRate,
        peerFundedPrincipal: peerFundedPrincipal.toFixed(2),
        peerFundedOutstandingPrincipal: peerFundedPrincipal.toFixed(2),
        currentPeerMonthlyRate: policy.peerBaseMonthlyRate,
        peerMonthlyRateIncrement: policy.peerMonthlyRateIncrement,
        peerCapRate: policy.peerCapRate,
        atCapBehavior: policy.atCapBehavior,
        status: isFullyPledgedAlready
          ? LoanStatus.PENDING_APPROVAL
          : LoanStatus.PENDING_PLEDGES,
      });

      const saved = await manager.save(Loan, loan);

      if (isFullyPledgedAlready) {
        await this.createDisbursementRequest(manager, tenantId, schemeId, saved);
      }

      return saved;
    });
  }

  /**
   * Records one member's pledge toward funding another member's
   * peer-funded excess. Once pledges reach the full peer-funded amount,
   * the loan automatically moves to PENDING_APPROVAL and an
   * OutboundRequest is created — pledging is a funding-source decision,
   * not a substitute for the treasury's 2-approver control.
   */
  async pledge(
    tenantId: string,
    loanId: string,
    pledgedAmount: string,
    actorUserId: string,
  ): Promise<Loan> {
    const amount = Number(pledgedAmount);
    if (!(amount > 0)) {
      throw new BadRequestException("pledgedAmount must be greater than zero.");
    }

    return this.dataSource.transaction(async (manager) => {
      const pledger = await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const loan = await manager.findOne(Loan, {
        where: { id: loanId, tenantId },
        lock: { mode: "pessimistic_write" },
      });

      if (!loan) {
        throw new NotFoundException("Loan not found.");
      }

      const schemeId = loan.schemeId;

      if (loan.status !== LoanStatus.PENDING_PLEDGES) {
        throw new BadRequestException(
          "This loan is not currently open for pledges.",
        );
      }

      if (pledger.id === loan.borrowerTenantUserId) {
        throw new BadRequestException(
          "The borrower cannot pledge toward their own loan.",
        );
      }

      const existingPledges = await manager.find(LoanPledge, {
        where: { loanId },
      });

      const alreadyPledged = existingPledges.reduce(
        (sum, pledge) => sum + Number(pledge.pledgedAmount),
        0,
      );
      const stillNeeded = Number(loan.peerFundedPrincipal) - alreadyPledged;

      if (amount > stillNeeded) {
        throw new BadRequestException(
          `This pledge exceeds what's still needed. Remaining amount to fund: ${stillNeeded.toFixed(2)}.`,
        );
      }

      const pledgerAvailableBalance =
        await this.memberBalanceService.getAvailableSelfFundingCapacity(
          manager,
          tenantId,
          loan.cycleId,
          pledger.id,
        );

      if (amount > pledgerAvailableBalance) {
        throw new BadRequestException(
          "Pledge amount exceeds your own available contribution balance.",
        );
      }

      const pledge = manager.create(LoanPledge, {
        tenantId,
        loanId,
        pledgingTenantUserId: pledger.id,
        pledgedAmount: amount.toFixed(2),
        outstandingPrincipal: amount.toFixed(2),
        pledgedAt: new Date(),
      });
      await manager.save(LoanPledge, pledge);

      const newTotalPledged = alreadyPledged + amount;
      const isFullyPledgedNow = newTotalPledged >= Number(loan.peerFundedPrincipal);

      if (isFullyPledgedNow) {
        loan.status = LoanStatus.PENDING_APPROVAL;
        await manager.save(Loan, loan);
        await this.createDisbursementRequest(manager, tenantId, schemeId, loan);
      }

      const refreshed = await manager.findOne(Loan, {
        where: { id: loanId },
        relations: { pledges: true },
      });

      return refreshed!;
    });
  }

  private async createDisbursementRequest(
    manager: EntityManager,
    tenantId: string,
    schemeId: string,
    loan: Loan,
  ): Promise<void> {
    const outboundRequest = await this.outboundRequestsService.initiateForTenantUser(
      tenantId,
      schemeId,
      {
        requestType: OutboundRequestType.LOAN_DISBURSEMENT,
        amount: loan.principalAmount,
        purpose: `Loan disbursement for loan ${loan.id}`,
        sourceReference: loan.id,
      },
      loan.borrowerTenantUserId,
      manager,
    );

    loan.outboundRequestId = outboundRequest.id;
    await manager.save(Loan, loan);
  }
}
