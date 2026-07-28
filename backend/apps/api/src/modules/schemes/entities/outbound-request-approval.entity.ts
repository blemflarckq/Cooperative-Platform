import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { OutboundRequest } from "./outbound-request.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { ApprovalDecision } from "../enums/governance.enums";

/**
 * One approver's decision on an OutboundRequest. A request needs
 * `requiredApprovals` (per its scheme's ApprovalPolicy) APPROVED rows from
 * *eligible* approvers before it can execute — a single REJECTED decision
 * ends the request immediately, since a rejection from any authorized
 * approver is a real veto, not just one vote among many.
 */
@Entity("outbound_request_approvals")
@Index(["outboundRequestId", "approverTenantUserId"], { unique: true })
export class OutboundRequestApproval extends BaseEntity {
  @Column("uuid")
  outboundRequestId!: string;

  @ManyToOne(() => OutboundRequest, (request) => request.approvals, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "outboundRequestId" })
  outboundRequest!: OutboundRequest;

  @Column("uuid")
  approverTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "approverTenantUserId" })
  approver!: TenantUser;

  @Column({ type: "enum", enum: ApprovalDecision })
  decision!: ApprovalDecision;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @Column({ type: "timestamptz" })
  decidedAt!: Date;
}
