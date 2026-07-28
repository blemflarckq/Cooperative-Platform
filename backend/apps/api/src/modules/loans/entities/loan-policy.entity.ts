import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { AtCapBehavior } from "../enums/loan.enums";

/**
 * LoanPolicy defines a scheme's interest rules — one policy per scheme,
 * same pattern as ApprovalPolicy.
 *
 * The self-funded tranche (borrowing against your own contributions) uses
 * a single fixed rate: there's no group risk on that portion, so no
 * escalation is needed. Its interest deliberately credits back into the
 * borrower's own contribution balance rather than group income — the
 * product's intent is to help members grow their own savings, not to
 * charge them for their own money.
 *
 * The peer-funded tranche (the excess, covered by other members' pledges)
 * escalates monthly up to a cap, since it represents real risk taken on
 * by other members' contributions.
 */
@Entity("loan_policies")
@Index(["tenantId", "schemeId"], { unique: true })
export class LoanPolicy extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "CASCADE" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  /** Fixed monthly rate (percent, e.g. "1.50" = 1.5%) for the self-funded tranche. */
  @Column({ type: "numeric", precision: 5, scale: 2 })
  selfFundedMonthlyRate!: string;

  /** Starting monthly rate (percent) for the peer-funded tranche. */
  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerBaseMonthlyRate!: string;

  /** How much the peer-funded rate climbs each month the loan stays outstanding. */
  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerMonthlyRateIncrement!: string;

  /** Ceiling on the peer-funded rate. */
  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerCapRate!: string;

  @Column({ type: "enum", enum: AtCapBehavior })
  atCapBehavior!: AtCapBehavior;
}
