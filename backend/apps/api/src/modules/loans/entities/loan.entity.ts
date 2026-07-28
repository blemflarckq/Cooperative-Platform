import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { OutboundRequest } from "../../schemes/entities/outbound-request.entity";
import { LoanPledge } from "./loan-pledge.entity";
import { AtCapBehavior, LoanStatus } from "../enums/loan.enums";

/**
 * A loan splits automatically into two tranches at request time:
 * - self-funded: up to the borrower's own contribution balance WITHIN
 *   THIS CYCLE (contributions in this codebase are tracked per operating
 *   cycle, not just per scheme — see Contribution.cycleId), auto-
 *   approved, fixed interest rate that credits back to the borrower.
 * - peer-funded: the excess, requiring other members' pledges and the
 *   standard 2-approver outbound request before disbursement.
 *
 * Interest terms (rate, increment, cap, atCapBehavior) are copied from the
 * scheme's LoanPolicy at the moment this loan is created — deliberately
 * NOT a live reference, so editing a scheme's policy later never
 * retroactively changes terms on a loan already in progress.
 */
@Entity("loans")
@Index(["tenantId", "schemeId", "status"])
export class Loan extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column("uuid")
  cycleId!: string;

  @ManyToOne(() => OperatingCycle, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "cycleId" })
  cycle!: OperatingCycle;

  @Column("uuid")
  borrowerTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "borrowerTenantUserId" })
  borrower!: TenantUser;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  principalAmount!: string;

  // --- Self-funded tranche ---
  @Column({ type: "numeric", precision: 18, scale: 2, default: "0.00" })
  selfFundedPrincipal!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, default: "0.00" })
  selfFundedOutstandingPrincipal!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  selfFundedMonthlyRate!: string;

  // --- Peer-funded tranche ---
  @Column({ type: "numeric", precision: 18, scale: 2, default: "0.00" })
  peerFundedPrincipal!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, default: "0.00" })
  peerFundedOutstandingPrincipal!: string;

  /** Current rate, escalates monthly up to peerCapRate. */
  @Column({ type: "numeric", precision: 5, scale: 2 })
  currentPeerMonthlyRate!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerMonthlyRateIncrement!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerCapRate!: string;

  @Column({ type: "enum", enum: AtCapBehavior })
  atCapBehavior!: AtCapBehavior;

  /** When the peer rate was last escalated — determines when the next escalation is due. */
  @Column({ type: "timestamptz", nullable: true })
  peerRateLastEscalatedAt!: Date | null;

  @Column({ type: "enum", enum: LoanStatus, default: LoanStatus.PENDING_PLEDGES })
  status!: LoanStatus;

  /**
   * Set once the peer rate hits its cap under FLAG_AND_BLOCK — the
   * borrower cannot take new loans in this scheme while this is true, and
   * it stays true until this loan is fully repaid, even if the outstanding
   * peer balance later drops (the flag is about full repayment, not
   * current balance).
   */
  @Column({ type: "boolean", default: false })
  isAtRiskFlagged!: boolean;

  @Column({ type: "uuid", nullable: true })
  outboundRequestId!: string | null;

  @ManyToOne(() => OutboundRequest, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "outboundRequestId" })
  outboundRequest!: OutboundRequest | null;

  @OneToMany(() => LoanPledge, (pledge) => pledge.loan)
  pledges!: LoanPledge[];
}
