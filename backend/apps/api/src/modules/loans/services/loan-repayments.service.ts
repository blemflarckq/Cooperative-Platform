import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanPledge } from "../entities/loan-pledge.entity";
import { LoanRepayment } from "../entities/loan-repayment.entity";
import { LoanPledgeRepaymentAllocation } from "../entities/loan-pledge-repayment-allocation.entity";
import { AccountingSequence } from "../../accounting/entities/accounting-sequence.entity";
import { Contribution } from "../../accounting/entities/contribution.entity";
import { ContributionSource, ContributionStatus } from "../../accounting/enums/contribution.enums";
import { LoanStatus } from "../enums/loan.enums";
import { JournalLineType, JournalSourceModule } from "../../accounting/enums/journal.enums";
import { PostingLineInput } from "../../accounting/posting/posting-engine.service";
import { PostingEngineService } from "../../accounting/posting/posting-engine.service";
import { AccountResolverService, SystemAccountKey } from "../../accounting/services/account-resolver.service";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";
import { allocateAcrossPledges, allocateRepayment } from "./loan-repayment-allocation";

@Injectable()
export class LoanRepaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
    private readonly postingEngine: PostingEngineService,
    private readonly accountResolver: AccountResolverService,
  ) {}

  /**
   * Records one repayment against a loan. This is where the pure
   * allocation math (allocateRepayment, allocateAcrossPledges) meets real
   * data: it computes how the payment splits across tranches and
   * individual pledges, posts a single journal entry for the whole
   * payment, and records interest credits as Contribution rows so they
   * flow into future balance calculations automatically — the same
   * mechanism as any other contribution, not a separate parallel ledger.
   */
  async recordRepayment(
    tenantId: string,
    loanId: string,
    amount: string,
    actorUserId: string,
  ): Promise<Loan> {
    const paymentAmount = Number(amount);
    if (!(paymentAmount > 0)) {
      throw new BadRequestException("amount must be greater than zero.");
    }

    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const loan = await manager.findOne(Loan, {
        where: { id: loanId, tenantId },
        lock: { mode: "pessimistic_write" },
      });

      if (!loan) {
        throw new NotFoundException("Loan not found.");
      }

      if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.AT_RISK) {
        throw new BadRequestException(
          "This loan is not currently active and cannot accept repayments.",
        );
      }

      const pledges = await manager.find(LoanPledge, { where: { loanId } });

      const allocation = allocateRepayment({
        amount: paymentAmount,
        selfFundedOutstandingPrincipal: Number(loan.selfFundedOutstandingPrincipal),
        selfFundedMonthlyRate: Number(loan.selfFundedMonthlyRate),
        peerFundedOutstandingPrincipal: Number(loan.peerFundedOutstandingPrincipal),
        peerFundedMonthlyRate: Number(loan.currentPeerMonthlyRate),
      });

      const pledgeAllocations = allocateAcrossPledges({
        totalPrincipal: allocation.peerFundedPrincipalPortion,
        totalInterest: allocation.peerFundedInterestPortion,
        pledges: pledges.map((pledge) => ({
          loanPledgeId: pledge.id,
          outstandingPrincipal: Number(pledge.outstandingPrincipal),
        })),
      });

      // Any overpayment beyond what's actually owed credits back to the
      // borrower's own savings rather than vanishing — no cash the member
      // actually paid should ever go unaccounted for.
      const selfInterestCredit = round2(
        allocation.selfFundedInterestPortion + allocation.overpaymentRemainder,
      );

      const totalPrincipal = round2(
        allocation.selfFundedPrincipalPortion + allocation.peerFundedPrincipalPortion,
      );
      const totalInterestCredited = round2(
        selfInterestCredit + allocation.peerFundedInterestPortion,
      );

      const journalEntry = await this.postRepaymentJournalEntry(manager, tenantId, loan.id, {
        paymentAmount,
        totalPrincipal,
        totalInterestCredited,
      });

      if (selfInterestCredit > 0) {
        await this.createInterestCreditContribution(
          manager,
          tenantId,
          loan.cycleId,
          loan.borrowerTenantUserId,
          selfInterestCredit,
          journalEntry.id,
          `Self-funded loan interest credit — loan ${loan.id}`,
        );
      }

      for (const pledgeAllocation of pledgeAllocations) {
        if (pledgeAllocation.interestPortion <= 0) continue;

        const pledge = pledges.find((p) => p.id === pledgeAllocation.loanPledgeId)!;

        await this.createInterestCreditContribution(
          manager,
          tenantId,
          loan.cycleId,
          pledge.pledgingTenantUserId,
          pledgeAllocation.interestPortion,
          journalEntry.id,
          `Pledge interest credit — loan ${loan.id}`,
        );
      }

      // Update outstanding balances.
      loan.selfFundedOutstandingPrincipal = round2(
        Number(loan.selfFundedOutstandingPrincipal) - allocation.selfFundedPrincipalPortion,
      ).toFixed(2);
      loan.peerFundedOutstandingPrincipal = round2(
        Number(loan.peerFundedOutstandingPrincipal) - allocation.peerFundedPrincipalPortion,
      ).toFixed(2);

      for (const pledgeAllocation of pledgeAllocations) {
        const pledge = pledges.find((p) => p.id === pledgeAllocation.loanPledgeId)!;
        pledge.outstandingPrincipal = round2(
          Number(pledge.outstandingPrincipal) - pledgeAllocation.principalPortion,
        ).toFixed(2);
        await manager.save(LoanPledge, pledge);
      }

      const isFullyRepaid =
        Number(loan.selfFundedOutstandingPrincipal) <= 0 &&
        Number(loan.peerFundedOutstandingPrincipal) <= 0;

      if (isFullyRepaid) {
        loan.status = LoanStatus.REPAID;
      }

      await manager.save(Loan, loan);

      const repayment = manager.create(LoanRepayment, {
        tenantId,
        loanId,
        totalAmount: paymentAmount.toFixed(2),
        selfFundedPrincipalPortion: allocation.selfFundedPrincipalPortion.toFixed(2),
        selfFundedInterestPortion: selfInterestCredit.toFixed(2),
        peerFundedPrincipalPortion: allocation.peerFundedPrincipalPortion.toFixed(2),
        peerFundedInterestPortion: allocation.peerFundedInterestPortion.toFixed(2),
        paidAt: new Date(),
      });
      const savedRepayment = await manager.save(LoanRepayment, repayment);

      for (const pledgeAllocation of pledgeAllocations) {
        if (pledgeAllocation.principalPortion <= 0 && pledgeAllocation.interestPortion <= 0) {
          continue;
        }

        const allocationRow = manager.create(LoanPledgeRepaymentAllocation, {
          loanRepaymentId: savedRepayment.id,
          loanPledgeId: pledgeAllocation.loanPledgeId,
          principalPortion: pledgeAllocation.principalPortion.toFixed(2),
          interestPortion: pledgeAllocation.interestPortion.toFixed(2),
        });
        await manager.save(LoanPledgeRepaymentAllocation, allocationRow);
      }

      return loan;
    });
  }

  private async postRepaymentJournalEntry(
    manager: EntityManager,
    tenantId: string,
    loanId: string,
    amounts: { paymentAmount: number; totalPrincipal: number; totalInterestCredited: number },
  ) {
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
    const memberSavingsLiabilityAccount = await this.accountResolver.resolveWithManager(
      manager,
      tenantId,
      SystemAccountKey.MEMBER_SAVINGS_LIABILITY,
    );

    const lines: PostingLineInput[] = [
      {
        accountId: cashAccount.id,
        lineType: JournalLineType.DEBIT,
        amount: amounts.paymentAmount.toFixed(2),
        memo: `Loan repayment received — loan ${loanId}`,
      },
    ];

    if (amounts.totalPrincipal > 0) {
      lines.push({
        accountId: loanReceivableAccount.id,
        lineType: JournalLineType.CREDIT,
        amount: amounts.totalPrincipal.toFixed(2),
        memo: `Loan principal repaid — loan ${loanId}`,
      });
    }

    if (amounts.totalInterestCredited > 0) {
      lines.push({
        accountId: memberSavingsLiabilityAccount.id,
        lineType: JournalLineType.CREDIT,
        amount: amounts.totalInterestCredited.toFixed(2),
        memo: `Loan interest credited to member savings — loan ${loanId}`,
      });
    }

    return this.postingEngine.postJournalEntryWithManager(manager, {
      tenantId,
      transactionDate: new Date().toISOString().slice(0, 10),
      description: `Loan repayment for loan ${loanId}`,
      sourceModule: JournalSourceModule.LOANS,
      sourceReference: loanId,
      lines,
    });
  }

  private async createInterestCreditContribution(
    manager: EntityManager,
    tenantId: string,
    cycleId: string,
    tenantUserId: string,
    amount: number,
    journalEntryId: string,
    notes: string,
  ): Promise<void> {
    const reference = await this.generateInterestCreditReference(manager, tenantId);

    const contribution = manager.create(Contribution, {
      tenantId,
      cycleId,
      tenantUserId,
      reference,
      contributionDate: new Date().toISOString().slice(0, 10),
      amount: amount.toFixed(2),
      source: ContributionSource.LOAN_INTEREST_CREDIT,
      status: ContributionStatus.POSTED,
      journalEntryId,
      notes,
    });

    await manager.save(Contribution, contribution);
  }

  private async generateInterestCreditReference(
    manager: EntityManager,
    tenantId: string,
  ): Promise<string> {
    const sequenceKey = "loan-interest-credit";
    const year = new Date().getFullYear();

    await manager.query(
      `
      INSERT INTO accounting_sequences (
        id, "tenantId", "sequenceKey", "currentValue", "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, 0, now(), now())
      ON CONFLICT ("tenantId", "sequenceKey") DO NOTHING
      `,
      [tenantId, sequenceKey],
    );

    const sequence = await manager.findOne(AccountingSequence, {
      where: { tenantId, sequenceKey },
      lock: { mode: "pessimistic_write" },
    });

    if (!sequence) {
      throw new Error("Failed to initialize loan interest credit sequence.");
    }

    sequence.currentValue += 1;
    const saved = await manager.save(AccountingSequence, sequence);

    return `LNINT-${year}-${String(saved.currentValue).padStart(6, "0")}`;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
