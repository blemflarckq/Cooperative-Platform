import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { MembershipEnrollmentRequest } from "./membership-enrollment-request.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { ApprovalDecision } from "../../schemes/enums/governance.enums";

/**
 * One approver's decision on a MembershipEnrollmentRequest — the same
 * shape as OutboundRequestApproval (money's approval trail), reused
 * because the underlying control is the same: two independent decisions
 * needed, a single rejection is a real veto, reusing the existing
 * ApprovalDecision enum rather than inventing an equivalent one.
 */
@Entity("membership_enrollment_approvals")
@Index(["enrollmentRequestId", "approverTenantUserId"], { unique: true })
export class MembershipEnrollmentApproval extends BaseEntity {
  @Column("uuid")
  enrollmentRequestId!: string;

  @ManyToOne(() => MembershipEnrollmentRequest, (request) => request.approvals, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "enrollmentRequestId" })
  enrollmentRequest!: MembershipEnrollmentRequest;

  @Column("uuid")
  approverTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "approverTenantUserId" })
  approver!: TenantUser;

  @Column({ type: "enum", enum: ApprovalDecision })
  decision!: ApprovalDecision;

  @Column({ type: "timestamptz" })
  decidedAt!: Date;
}
