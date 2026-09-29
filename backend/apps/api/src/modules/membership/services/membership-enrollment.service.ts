import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { DataSource, IsNull, LessThan } from "typeorm";
import { InviteLink } from "../entities/invite-link.entity";
import { MembershipEnrollmentRequest } from "../entities/membership-enrollment-request.entity";
import { MembershipEnrollmentApproval } from "../entities/membership-enrollment-approval.entity";
import { MembershipEnrollmentStatus } from "../enums/membership-enrollment.enums";
import { ApprovalDecision } from "../../schemes/enums/governance.enums";
import {
  assertCanRecordEnrollmentApproval,
  resolveEnrollmentStatus,
  REQUIRED_ENROLLMENT_APPROVALS,
} from "./membership-enrollment-workflow";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { TenantUserRole } from "../../identity/entities/tenant-user-role.entity";
import { Role } from "../../identity/entities/role.entity";
import { Tenant } from "../../identity/entities/tenant.entity";

const INVITE_LINK_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours — see InviteLink entity for why.

// Deliberately its own explicit constant, not a reuse of the broader
// STAFF_ROLE_CODES list used elsewhere (which also includes secretary) —
// deciding who gets into the cooperative at all is a narrower question
// than day-to-day staff operations, matching the same tenant_admin/
// treasurer convention already established for accounting_settings:update.
const ENROLLMENT_APPROVER_ROLE_CODES = ["tenant_admin", "treasurer"];

@Injectable()
export class MembershipEnrollmentService {
  constructor(private readonly dataSource: DataSource) {}

  async generateInviteLink(
    tenantId: string,
    actorUserId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const actor = await this.resolveEligibleActor(tenantId, actorUserId);

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_LINK_LIFETIME_MS);

    const link = this.dataSource.getRepository(InviteLink).create({
      tenantId,
      token,
      generatedByTenantUserId: actor.id,
      expiresAt,
      consumedAt: null,
    });

    await this.dataSource.getRepository(InviteLink).save(link);

    return { token, expiresAt };
  }

  /**
   * Public — called before the person is necessarily authenticated, so
   * the frontend's join page can show "you've been invited to X" or a
   * clear reason it can't be followed, before asking them to log in or
   * register.
   */
  async getInviteLinkPreview(
    token: string,
  ): Promise<{ valid: boolean; tenantName?: string; reason?: string }> {
    const link = await this.dataSource.getRepository(InviteLink).findOne({
      where: { token },
      relations: { generatedBy: true },
    });

    if (!link) {
      return { valid: false, reason: "not_found" };
    }
    if (link.consumedAt) {
      return { valid: false, reason: "already_used" };
    }
    if (link.expiresAt.getTime() < Date.now()) {
      return { valid: false, reason: "expired" };
    }

    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: link.tenantId },
    });

    return { valid: true, tenantName: tenant?.name ?? tenant?.slug };
  }

  async acceptInvite(token: string, actorUserId: string): Promise<MembershipEnrollmentRequest> {
    return this.dataSource.transaction(async (manager) => {
      const link = await manager.findOne(InviteLink, {
        where: { token },
        lock: { mode: "pessimistic_write" },
      });

      if (!link) {
        throw new NotFoundException("This invite link doesn't exist.");
      }
      if (link.consumedAt) {
        throw new BadRequestException("This invite link has already been used.");
      }
      if (link.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException("This invite link has expired.");
      }

      const alreadyMember = await manager.findOne(TenantUser, {
        where: { tenantId: link.tenantId, userId: actorUserId },
      });
      if (alreadyMember) {
        throw new BadRequestException("You're already a member of this cooperative.");
      }

      const existingPending = await manager.findOne(MembershipEnrollmentRequest, {
        where: {
          tenantId: link.tenantId,
          userId: actorUserId,
          status: MembershipEnrollmentStatus.PENDING_APPROVAL,
        },
      });
      if (existingPending) {
        throw new BadRequestException(
          "You already have an enrollment request awaiting approval for this cooperative.",
        );
      }

      const enrollment = manager.create(MembershipEnrollmentRequest, {
        tenantId: link.tenantId,
        inviteLinkId: link.id,
        userId: actorUserId,
        status: MembershipEnrollmentStatus.PENDING_APPROVAL,
        expiresAt: link.expiresAt,
      });
      const savedEnrollment = await manager.save(MembershipEnrollmentRequest, enrollment);

      link.consumedAt = new Date();
      await manager.save(InviteLink, link);

      return savedEnrollment;
    });
  }

  async listPendingEnrollments(tenantId: string): Promise<MembershipEnrollmentRequest[]> {
    return this.dataSource.getRepository(MembershipEnrollmentRequest).find({
      where: { tenantId, status: MembershipEnrollmentStatus.PENDING_APPROVAL },
      relations: { user: true, approvals: { approver: { user: true } } },
      order: { createdAt: "ASC" },
    });
  }

  async recordApproval(
    tenantId: string,
    enrollmentRequestId: string,
    actorUserId: string,
    decision: ApprovalDecision,
  ): Promise<MembershipEnrollmentRequest> {
    return this.dataSource.transaction(async (manager) => {
      const actor = await manager.findOne(TenantUser, {
        where: { tenantId, userId: actorUserId, isActive: true },
        relations: { roles: { role: true } },
      });

      if (!actor) {
        throw new ForbiddenException("You are not an active member of this tenant.");
      }

      const isEligibleApprover = actor.roles.some((assignment) =>
        ENROLLMENT_APPROVER_ROLE_CODES.includes(assignment.role.code),
      );

      const enrollment = await manager.findOne(MembershipEnrollmentRequest, {
        where: { id: enrollmentRequestId, tenantId },
        relations: { approvals: true },
        lock: { mode: "pessimistic_write" },
      });

      if (!enrollment) {
        throw new NotFoundException("Enrollment request not found.");
      }

      const existingApproverIds = enrollment.approvals?.map((a) => a.approverTenantUserId) ?? [];

      assertCanRecordEnrollmentApproval({
        requestStatus: enrollment.status,
        isEligibleApprover,
        existingApproverIds,
        approverTenantUserId: actor.id,
      });

      const approval = manager.create(MembershipEnrollmentApproval, {
        enrollmentRequestId: enrollment.id,
        approverTenantUserId: actor.id,
        decision,
        decidedAt: new Date(),
      });
      await manager.save(MembershipEnrollmentApproval, approval);

      const allDecisions = [
        ...(enrollment.approvals?.map((a) => a.decision) ?? []),
        decision,
      ];
      const newStatus = resolveEnrollmentStatus({
        decisions: allDecisions,
        requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS,
      });
      enrollment.status = newStatus;

      if (newStatus === MembershipEnrollmentStatus.APPROVED) {
        const memberRole = await manager.findOne(Role, {
          where: { tenantId, code: "member" },
        });
        if (!memberRole) {
          throw new Error("Default member role missing for this tenant — cannot complete enrollment.");
        }

        const newTenantUser = manager.create(TenantUser, {
          tenantId,
          userId: enrollment.userId,
          isActive: true,
        });
        const savedTenantUser = await manager.save(TenantUser, newTenantUser);

        const roleAssignment = manager.create(TenantUserRole, {
          tenantUserId: savedTenantUser.id,
          roleId: memberRole.id,
        });
        await manager.save(TenantUserRole, roleAssignment);
      }

      return manager.save(MembershipEnrollmentRequest, enrollment);
    });
  }

  /**
   * The scheduled cleanup job's target. Deliberately narrow, per the
   * explicit rule: only enrollments with ZERO approvals get removed once
   * their invite link's 4-hour window has passed. Anything that got even
   * one approval — real signal that a human vouched for this person —
   * is left alone rather than silently deleted, even though it hasn't
   * reached the full two required. Deleting the InviteLink is enough:
   * both MembershipEnrollmentRequest and its approvals cascade-delete
   * from there, since both relations are configured with onDelete:
   * CASCADE back to the link they descend from.
   */
  async cleanupExpiredEnrollments(): Promise<{ deletedInviteLinks: number }> {
    const now = new Date();
    let deletedCount = 0;

    // Links nobody ever followed — nothing depends on these at all.
    const expiredNeverFollowed = await this.dataSource.getRepository(InviteLink).find({
      where: { consumedAt: IsNull(), expiresAt: LessThan(now) },
    });
    if (expiredNeverFollowed.length > 0) {
      await this.dataSource
        .getRepository(InviteLink)
        .delete(expiredNeverFollowed.map((link) => link.id));
      deletedCount += expiredNeverFollowed.length;
    }

    // Links that WERE followed, whose resulting enrollment expired with
    // zero approvals.
    const expiredPending = await this.dataSource.getRepository(MembershipEnrollmentRequest).find({
      where: { status: MembershipEnrollmentStatus.PENDING_APPROVAL, expiresAt: LessThan(now) },
      relations: { approvals: true },
    });

    const idsToDelete = expiredPending
      .filter((request) => !(request.approvals ?? []).some((a) => a.decision === ApprovalDecision.APPROVED))
      .map((request) => request.inviteLinkId);

    if (idsToDelete.length > 0) {
      await this.dataSource.getRepository(InviteLink).delete(idsToDelete);
      deletedCount += idsToDelete.length;
    }

    return { deletedInviteLinks: deletedCount };
  }

  private async resolveEligibleActor(tenantId: string, actorUserId: string): Promise<TenantUser> {
    const actor = await this.dataSource.getRepository(TenantUser).findOne({
      where: { tenantId, userId: actorUserId, isActive: true },
      relations: { roles: { role: true } },
    });

    if (!actor) {
      throw new ForbiddenException("You are not an active member of this tenant.");
    }

    const isEligible = actor.roles.some((assignment) =>
      ENROLLMENT_APPROVER_ROLE_CODES.includes(assignment.role.code),
    );

    if (!isEligible) {
      throw new ForbiddenException("Only an admin or treasurer can invite new members.");
    }

    return actor;
  }
}
