import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Loan } from "../entities/loan.entity";
import { LoanStatus, RateScheduleMode } from "../enums/loan.enums";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";
import { computeNextMonthlyRate } from "./loan-interest-escalation";
import { planScheduledRateUpdate } from "./loan-rate-schedule";
import { applyRatePlanToLoan, flagLoanAtRisk, toLoanRateTerms } from "./loan-rate-schedule.service";

/**
 * A treasurer's manual lever on a single loan. Rates now also move
 * automatically (see LoanRateScheduleService, run daily), so this is for
 * stepping in, not for routine operation:
 *
 * - RAMP: applies one monthly step right now, exactly as it always did.
 * - PERIODS: re-evaluates the loan against its schedule right now — the
 *   rate is a function of the loan's age, so there's no "one step" to
 *   take, only "make it correct for today."
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

      const now = new Date();

      if (loan.rateScheduleMode === RateScheduleMode.PERIODS) {
        applyRatePlanToLoan(loan, planScheduledRateUpdate(toLoanRateTerms(loan), now), now);
      } else {
        const { nextRate, shouldFlagAtRisk } = computeNextMonthlyRate({
          currentRate: Number(loan.currentPeerMonthlyRate),
          increment: Number(loan.peerMonthlyRateIncrement),
          capRate: Number(loan.peerCapRate),
          atCapBehavior: loan.atCapBehavior,
        });

        loan.currentPeerMonthlyRate = nextRate.toFixed(2);
        loan.peerRateLastEscalatedAt = now;

        if (shouldFlagAtRisk) {
          flagLoanAtRisk(loan, now);
        }
      }

      return manager.save(Loan, loan);
    });
  }
}
