import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { InviteLink } from "./invite-link.entity";
import { User } from "../../identity/entities/user.entity";
import { MembershipEnrollmentStatus } from "../enums/membership-enrollment.enums";
import { MembershipEnrollmentApproval } from "./membership-enrollment-approval.entity";

/**
 * Deliberately references the applicant by their global userId, not a
 * TenantUser — a TenantUser is exactly what approval creates, so one
 * can't exist yet here. This is what makes the cleanup job safe: an
 * expired, unapproved request is just this one small row plus its
 * approvals, never a real membership link, and never anything that
 * could touch the applicant's account in another tenant they may
 * already belong to.
 *
 * expiresAt is copied from the parent InviteLink at creation time, not
 * recomputed — the whole enrollment lives inside the same 4-hour window
 * the invite link itself was generated for.
 */
@Entity("membership_enrollment_requests")
@Index(["tenantId", "status"])
export class MembershipEnrollmentRequest extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  inviteLinkId!: string;

  @ManyToOne(() => InviteLink, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inviteLinkId" })
  inviteLink!: InviteLink;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({
    type: "enum",
    enum: MembershipEnrollmentStatus,
    default: MembershipEnrollmentStatus.PENDING_APPROVAL,
  })
  status!: MembershipEnrollmentStatus;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @OneToMany(() => MembershipEnrollmentApproval, (approval) => approval.enrollmentRequest)
  approvals?: MembershipEnrollmentApproval[];
}
