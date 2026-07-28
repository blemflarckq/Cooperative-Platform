import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanStatus } from "../enums/loan.enums";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";
import { computeNextMonthlyRate } from "./loan-interest-escalation";

/**
 * Escalates a single active loan's peer-funded rate by one step, per the
 * rules in loan-interest-escalation.ts.
 *
 * IMPORTANT — this is currently manually triggered, not scheduled. There's
 * no monthly cron job calling this yet; that's the next piece of
 * infrastructure needed (a scheduled task, most naturally in the worker
 * app) before this actually escalates automatically over time. Built and
 * tested in isolation first, same as everything else this project has
 * done with money logic — wiring it to a real clock is a deliberate next
 * step, not an oversight.
 */
@Injectable()
export class LoanRateEscalationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
  ) {}

  async escalateOne(tenantId: string, loanId: string, actorUserId: string): Promise<Loan> {
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
          "Only active loans have a peer-funded rate to escalate.",
        );
      }

      if (Number(loan.peerFundedOutstandingPrincipal) <= 0) {
        // Nothing left to charge interest on for this tranche — no-op.
        return loan;
      }

      const { nextRate, shouldFlagAtRisk } = computeNextMonthlyRate({
        currentRate: Number(loan.currentPeerMonthlyRate),
        increment: Number(loan.peerMonthlyRateIncrement),
        capRate: Number(loan.peerCapRate),
        atCapBehavior: loan.atCapBehavior,
      });

      loan.currentPeerMonthlyRate = nextRate.toFixed(2);
      loan.peerRateLastEscalatedAt = new Date();

      if (shouldFlagAtRisk) {
        loan.isAtRiskFlagged = true;
        loan.status = LoanStatus.AT_RISK;
      }

      return manager.save(Loan, loan);
    });
  }
}
