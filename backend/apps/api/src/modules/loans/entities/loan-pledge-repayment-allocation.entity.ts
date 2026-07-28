import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { LoanRepayment } from "./loan-repayment.entity";
import { LoanPledge } from "./loan-pledge.entity";

/**
 * Breaks a single repayment's peer-funded portion down across the
 * individual members who pledged toward that loan, proportional to each
 * pledge's outstanding balance at the time of that repayment. This is
 * what makes "each pledging member earns interest on their own stake" an
 * actual, queryable fact rather than something only true in aggregate —
 * without this table, there'd be no way to answer "how much has member X
 * earned from pledges" without recomputing it from scratch every time.
 */
@Entity("loan_pledge_repayment_allocations")
export class LoanPledgeRepaymentAllocation extends BaseEntity {
  @Column("uuid")
  loanRepaymentId!: string;

  @ManyToOne(() => LoanRepayment, (repayment) => repayment.pledgeAllocations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "loanRepaymentId" })
  loanRepayment!: LoanRepayment;

  @Column("uuid")
  loanPledgeId!: string;

  @ManyToOne(() => LoanPledge, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "loanPledgeId" })
  loanPledge!: LoanPledge;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  principalPortion!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  interestPortion!: string;
}
