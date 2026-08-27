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
  // LoanRepaymentsService is exported specifically so PaymentsModule can
  // reach it via proper DI — the payment allocation engine needs to
  // record loan repayments as part of an atomic allocation, without
  // duplicating that logic or reaching into LoansModule's internals.
  exports: [LoanPolicyService, LoansService, LoanRepaymentsService],
})
export class LoansModule {}
