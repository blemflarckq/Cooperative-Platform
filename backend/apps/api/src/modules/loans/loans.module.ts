import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchemesModule } from "../schemes/schemes.module";
import { AccountingModule } from "../accounting/accounting.module";
import { LoanPolicy } from "./entities/loan-policy.entity";
import { Loan } from "./entities/loan.entity";
import { LoanPledge } from "./entities/loan-pledge.entity";
import { LoanRepayment } from "./entities/loan-repayment.entity";
import { LoanPledgeRepaymentAllocation } from "./entities/loan-pledge-repayment-allocation.entity";
import { LoanPolicyService } from "./services/loan-policy.service";
import { LoansService } from "./services/loans.service";
import { MemberBalanceService } from "./services/member-balance.service";
import { LoanDisbursementService } from "./services/loan-disbursement.service";
import { LoanRepaymentsService } from "./services/loan-repayments.service";
import { LoanRateEscalationService } from "./services/loan-rate-escalation.service";
import { LoanPolicyController } from "./controllers/loan-policy.controller";
import { LoansController } from "./controllers/loans.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanPolicy,
      Loan,
      LoanPledge,
      LoanRepayment,
      LoanPledgeRepaymentAllocation,
    ]),
    // Loans depends on SchemesModule for ActorTenantUserResolverService
    // and OutboundRequestsService — every loan disbursement flows through
    // the same 2-approver engine as any other withdrawal. It depends on
    // AccountingModule for the posting engine and account resolver, since
    // disbursement and repayment both post real journal entries.
    SchemesModule,
    AccountingModule,
  ],
  providers: [
    LoanPolicyService,
    LoansService,
    MemberBalanceService,
    LoanDisbursementService,
    LoanRepaymentsService,
    LoanRateEscalationService,
  ],
  controllers: [LoanPolicyController, LoansController],
  exports: [LoanPolicyService, LoansService],
})
export class LoansModule {}
