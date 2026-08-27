import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoansModule } from "../loans/loans.module";
import { AccountingModule } from "../accounting/accounting.module";
import { RecordedPayment } from "./entities/recorded-payment.entity";
import { PaymentAllocationService } from "./services/payment-allocation.service";
import { PaymentAllocationController } from "./controllers/payment-allocation.controller";

/**
 * Owns the "record now, allocate later" payment flow — deliberately its
 * own module, not folded into loans. Recording a payment and allocating
 * it are about routing money across loans AND contributions together;
 * treating that as a loans concern undersold what it actually does, and
 * would have made it the wrong place for a future developer to look.
 *
 * Depends on LoansModule for LoanRepaymentsService (recording a loan
 * repayment as part of an allocation) and AccountingModule for
 * ContributionsService (recording the remainder as a contribution) —
 * both reached through their modules' actual exports, not by reaching
 * into internals.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RecordedPayment]),
    LoansModule,
    AccountingModule,
  ],
  providers: [PaymentAllocationService],
  controllers: [PaymentAllocationController],
  exports: [PaymentAllocationService],
})
export class PaymentsModule {}
