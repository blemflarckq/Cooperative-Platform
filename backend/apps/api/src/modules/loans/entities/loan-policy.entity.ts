import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { AtCapBehavior } from "../enums/loan.enums";

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

  @Column({ type: "numeric", precision: 5, scale: 2 })
  selfFundedMonthlyRate!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerBaseMonthlyRate!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerMonthlyRateIncrement!: string;

  @Column({ type: "numeric", precision: 5, scale: 2 })
  peerCapRate!: string;

  @Column({ type: "enum", enum: AtCapBehavior })
  atCapBehavior!: AtCapBehavior;

  /**
   * True once a Treasurer has explicitly reviewed and confirmed these
   * terms — set automatically the moment someone calls the upsert
   * endpoint with real values, since doing that IS the review action.
   * False means this row is still the auto-created draft from scheme
   * activation, with placeholder numbers nobody has actually chosen —
   * loans cannot be requested against an unreviewed policy.
   */
  @Column({ type: "boolean", default: false })
  isReviewed!: boolean;
}
