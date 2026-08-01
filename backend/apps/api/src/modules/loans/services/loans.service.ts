import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanPolicy } from "../entities/loan-policy.entity";
import { LoanPledge } from "../entities/loan-pledge.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { LoanStatus } from "../enums/loan.enums";
import { OutboundRequestType } from "../../schemes/enums/governance.enums";
import { splitLoanIntoTranches } from "./loan-tranche-split";
import { MemberBalanceService } from "./member-balance.service";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";
import { OutboundRequestsService } from "../../schemes/services/outbound-requests.service";
import { OperatingCyclesService } from "../../schemes/services/operating-cycles.service";

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
    private readonly operatingCyclesService: OperatingCyclesService,
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

  /**
   * Requests a new loan for the acting user, scoped to a SCHEME only —
   * not a cycle. The member never needs to know or select a cycle; the
   * current one is resolved internally via OperatingCyclesService, which
   * for project-based schemes returns the single implicit cycle created
   * automatically when the scheme activated, and for recurring schemes
   * returns whichever cycle the Treasurer currently has open. This is the
   * actual fix for "cycles feel clunky" — the concept still exists in the
   * data model (it has to, since contributions/balances are tracked per
   * cycle), it's just no longer something any API caller outside this
   * service needs to resolve themselves.
   */
  /**
   * Computes what a loan request WOULD look like — the tranche split —
   * without actually creating anything. This is what powers the live
   * "here's how this breaks down" preview a member sees while typing an
   * amount, before they submit. Deliberately read-only and side-effect
   * free, and just as importantly: still scheme-scoped only, resolving
   * the cycle internally exactly like requestLoan() does, so the preview
   * never leaks "cycle" as a concept either.
   */
  async previewSplit(
    tenantId: string,
    schemeId: string,
    amount: string,
    actorUserId: string,
  ): Promise<{ selfFundedPrincipal: string; peerFundedPrincipal: string }> {
    const requestedAmount = Number(amount);
    if (!(requestedAmount > 0)) {
      throw new BadRequestException("amount must be greater than zero.");
    }

    return this.dataSource.transaction(async (manager) => {
      const borrower = await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const cycle = await this.operatingCyclesService.resolveCurrentCycle(
        manager,
        tenantId,
        schemeId,
      );

      const availableSelfFunding =
        await this.memberBalanceService.getAvailableSelfFundingCapacity(
          manager,
          tenantId,
          cycle.id,
          borrower.id,
        );

      const { selfFundedPrincipal, peerFundedPrincipal } = splitLoanIntoTranches({
        requestedAmount,
        borrowerContributionBalance: availableSelfFunding,
      });

      return {
        selfFundedPrincipal: selfFundedPrincipal.toFixed(2),
        peerFundedPrincipal: peerFundedPrincipal.toFixed(2),
      };
    });
  }

  async requestLoan(
    tenantId: string,
    schemeId: string,
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

      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id: schemeId, tenantId },
      });
      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      const cycle = await this.operatingCyclesService.resolveCurrentCycle(
        manager,
        tenantId,
        schemeId,
      );

      const policy = await manager.findOne(LoanPolicy, {
        where: { tenantId, schemeId },
      });
      if (!policy) {
        throw new BadRequestException(
          "This scheme has no loan policy configured yet — set one up before requesting a loan.",
        );
      }
      if (!policy.isReviewed) {
        throw new BadRequestException(
          "This scheme's loan policy is still a draft — a Treasurer needs to review and confirm the interest terms before loans can be requested.",
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
          cycle.id,
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
        cycleId: cycle.id,
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
