import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Loan } from "./loan.entity";
import { LoanPledgeRepaymentAllocation } from "./loan-pledge-repayment-allocation.entity";

/**
 * One repayment event against a loan, split across both tranches. The
 * self-funded interest portion is what ultimately credits back to the
 * borrower's own contribution balance; the peer-funded interest portion
 * gets further broken down per pledging member — see
 * LoanPledgeRepaymentAllocation.
 */
@Entity("loan_repayments")
@Index(["tenantId", "loanId"])
export class LoanRepayment extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  loanId!: string;

  @ManyToOne(() => Loan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "loanId" })
  loan!: Loan;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  totalAmount!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  selfFundedPrincipalPortion!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  selfFundedInterestPortion!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  peerFundedPrincipalPortion!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  peerFundedInterestPortion!: string;

  @Column({ type: "timestamptz" })
  paidAt!: Date;

  @OneToMany(
    () => LoanPledgeRepaymentAllocation,
    (allocation) => allocation.loanRepayment,
  )
  pledgeAllocations!: LoanPledgeRepaymentAllocation[];
}
