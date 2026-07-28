import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "./cooperative-scheme.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { OutboundRequestApproval } from "./outbound-request-approval.entity";
import { OutboundRequestStatus, OutboundRequestType } from "../enums/governance.enums";

/**
 * OutboundRequest represents any money leaving a scheme's pooled account —
 * a loan disbursement, a project expense, a general withdrawal. Every one
 * of these moves through the same lifecycle: INITIATED -> (2 approvals) ->
 * APPROVED -> EXECUTED, or REJECTED at any point before execution.
 *
 * This is the single mechanism the roadmap keeps referring to as "the
 * approval workflow engine" — loans are the first real user of it, not a
 * separate thing.
 */
@Entity("outbound_requests")
@Index(["tenantId", "schemeId", "status"])
export class OutboundRequest extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column({ type: "enum", enum: OutboundRequestType })
  requestType!: OutboundRequestType;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Column({ type: "text" })
  purpose!: string;

  @Column({
    type: "enum",
    enum: OutboundRequestStatus,
    default: OutboundRequestStatus.INITIATED,
  })
  status!: OutboundRequestStatus;

  @Column("uuid")
  initiatedByTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "initiatedByTenantUserId" })
  initiatedBy!: TenantUser;

  /**
   * Free-form reference to the thing that caused this request — e.g. a
   * loan application id. Not a foreign key on purpose: this entity is
   * meant to stay generic across request types (loans today, project
   * expenses later) rather than couple to any one domain module.
   */
  @Column({ type: "varchar", length: 120, nullable: true })
  sourceReference!: string | null;

  @Column({ type: "uuid", nullable: true })
  executedJournalEntryId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  executedAt!: Date | null;

  @OneToMany(() => OutboundRequestApproval, (approval) => approval.outboundRequest)
  approvals!: OutboundRequestApproval[];
}
