import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { Contribution } from "../../accounting/entities/contribution.entity";
import { ContributionStatus } from "../../accounting/enums/contribution.enums";
import { Loan } from "../entities/loan.entity";
import { LoanStatus } from "../enums/loan.enums";

/**
 * Computes how much of a member's own money is actually available to
 * self-fund a new loan, within a specific cycle (contributions in this
 * codebase are tracked per operating cycle — see Contribution.cycleId).
 *
 * This is deliberately NOT just "sum of posted contributions" — it also
 * subtracts whatever self-funded principal the member already has
 * outstanding on other active loans in this cycle. Without that
 * subtraction, a member could use the same contribution balance as
 * collateral for multiple loans simultaneously, which defeats the entire
 * point of the self-funded tranche being risk-free to the group.
 */
@Injectable()
export class MemberBalanceService {
  async getAvailableSelfFundingCapacity(
    manager: EntityManager,
    tenantId: string,
    cycleId: string,
    tenantUserId: string,
  ): Promise<number> {
    const contributions = await manager.find(Contribution, {
      where: {
        tenantId,
        cycleId,
        tenantUserId,
        status: ContributionStatus.POSTED,
      },
    });

    const totalContributed = contributions.reduce(
      (sum, contribution) => sum + Number(contribution.amount),
      0,
    );

    const existingLoans = await manager.find(Loan, {
      where: {
        tenantId,
        cycleId,
        borrowerTenantUserId: tenantUserId,
      },
    });

    const alreadyCommitted = existingLoans
      .filter((loan) => loan.status !== LoanStatus.REPAID)
      .reduce((sum, loan) => sum + Number(loan.selfFundedOutstandingPrincipal), 0);

    return Math.max(0, totalContributed - alreadyCommitted);
  }
}
