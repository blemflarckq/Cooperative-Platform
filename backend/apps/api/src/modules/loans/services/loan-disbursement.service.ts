import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { OutboundRequest } from "../../schemes/entities/outbound-request.entity";
import { LoanStatus } from "../enums/loan.enums";
import { OutboundRequestStatus } from "../../schemes/enums/governance.enums";
import { JournalLineType, JournalSourceModule } from "../../accounting/enums/journal.enums";
import { PostingEngineService } from "../../accounting/posting/posting-engine.service";
import { AccountResolverService, SystemAccountKey } from "../../accounting/services/account-resolver.service";
import { OutboundRequestsService } from "../../schemes/services/outbound-requests.service";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";

/**
 * LoanDisbursementService is the "make it real" step: once a loan's
 * OutboundRequest has cleared its 2 approvals, this actually posts the
 * money movement and activates the loan. Deliberately a separate,
 * explicit action from the approval itself — reaching APPROVED and money
 * actually moving are two different events with two different audit
 * trails (see OutboundRequestsService.markExecuted).
 *
 * Both tranches disburse together as one real cash movement: the pooled
 * account doesn't have separate "self" vs "peer" sub-wallets, so the full
 * principal leaves as one payment regardless of how it's split internally
 * for interest/collateral purposes.
 */
@Injectable()
export class LoanDisbursementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
    private readonly postingEngine: PostingEngineService,
    private readonly accountResolver: AccountResolverService,
    private readonly outboundRequestsService: OutboundRequestsService,
  ) {}

  async disburse(tenantId: string, loanId: string, actorUserId: string): Promise<Loan> {
    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const loan = await manager.findOne(Loan, {
        where: { id: loanId, tenantId },
        lock: { mode: "pessimistic_write" },
      });

      if (!loan) {
        throw new NotFoundException("Loan not found.");
      }

      if (loan.status !== LoanStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          "This loan is not awaiting disbursement.",
        );
      }

      if (!loan.outboundRequestId) {
        throw new BadRequestException(
          "This loan has no associated outbound request.",
        );
      }

      const outboundRequest = await manager.findOne(OutboundRequest, {
        where: { id: loan.outboundRequestId, tenantId },
      });

      if (!outboundRequest || outboundRequest.status !== OutboundRequestStatus.APPROVED) {
        throw new BadRequestException(
          "The outbound request for this loan has not been fully approved yet.",
        );
      }

      const cashAccount = await this.accountResolver.resolveWithManager(
        manager,
        tenantId,
        SystemAccountKey.CASH,
      );
      const loanReceivableAccount = await this.accountResolver.resolveWithManager(
        manager,
        tenantId,
        SystemAccountKey.LOAN_RECEIVABLE,
      );

      const journalEntry = await this.postingEngine.postJournalEntryWithManager(manager, {
        tenantId,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `Loan disbursement for loan ${loan.id}`,
        sourceModule: JournalSourceModule.LOANS,
        sourceReference: loan.id,
        lines: [
          {
            accountId: loanReceivableAccount.id,
            lineType: JournalLineType.DEBIT,
            amount: loan.principalAmount,
            memo: `Loan receivable — loan ${loan.id}`,
          },
          {
            accountId: cashAccount.id,
            lineType: JournalLineType.CREDIT,
            amount: loan.principalAmount,
            memo: `Cash disbursed — loan ${loan.id}`,
          },
        ],
      });

      await this.outboundRequestsService.markExecuted(
        manager,
        tenantId,
        outboundRequest.schemeId,
        outboundRequest.id,
        journalEntry.id,
      );

      loan.status = LoanStatus.ACTIVE;
      loan.peerRateLastEscalatedAt = new Date();

      return manager.save(Loan, loan);
    });
  }
}
