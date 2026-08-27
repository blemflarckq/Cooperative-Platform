import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { RecordedPaymentStatus } from "../enums/recorded-payment.enums";

/**
 * The first of two deliberately separate steps: staff (admin, treasurer,
 * secretary — anyone holding payment:record) captures "this person paid
 * this much" as a complete, standalone fact, with no decision yet made
 * about where the money goes. That decision — allocation — is the
 * payer's own action to take when they next log in; staff can also do it
 * for them, but only as an assist, not the primary path.
 *
 * This separation matters because staff usually can't know a payer's
 * full picture of obligations across every scheme at the moment cash
 * arrives — mobile money payments carry no meaningful reference, so
 * recording and deciding-where-it-goes are genuinely different moments
 * done by different people in the normal case.
 */
@Entity("recorded_payments")
@Index(["tenantId", "tenantUserId", "status"])
export class RecordedPayment extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  tenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantUserId" })
  tenantUser!: TenantUser;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Column("uuid")
  recordedByTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "recordedByTenantUserId" })
  recordedBy!: TenantUser;

  @Column({ type: "timestamptz" })
  recordedAt!: Date;

  @Column({
    type: "enum",
    enum: RecordedPaymentStatus,
    default: RecordedPaymentStatus.UNALLOCATED,
  })
  status!: RecordedPaymentStatus;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  allocatedAt!: Date | null;

  @Column("uuid", { nullable: true })
  allocatedByTenantUserId!: string | null;
}
