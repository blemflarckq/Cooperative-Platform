import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { DataSource, EntityManager, IsNull, LessThan } from "typeorm";
import { InviteLink } from "../entities/invite-link.entity";
import { MembershipEnrollmentRequest } from "../entities/membership-enrollment-request.entity";
import { MembershipEnrollmentApproval } from "../entities/membership-enrollment-approval.entity";
import { MembershipEnrollmentStatus } from "../enums/membership-enrollment.enums";
import { ApprovalDecision } from "../../schemes/enums/governance.enums";
import {
  assertCanRecordEnrollmentApproval,
  DEFAULT_ENROLLMENT_EXPIRY_POLICY,
  getEnrollmentLapse,
  resolveEnrollmentStatus,
  REQUIRED_ENROLLMENT_APPROVALS,
} from "./membership-enrollment-workflow";
import { MembershipEnrollmentResponseMapper } from "../mappers/membership-enrollment-response.mapper";
import { MEMBERSHIP_PERMISSIONS } from "../membership.permissions";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { TenantUserRole } from "../../identity/entities/tenant-user-role.entity";
import { Role } from "../../identity/entities/role.entity";
import { Tenant } from "../../identity/entities/tenant.entity";

// Every time limit lives in DEFAULT_ENROLLMENT_EXPIRY_POLICY (see the workflow
// file) — this service reads the policy rather than owning any constants.

// Who may do what is decided by the membership:invite and membership:approve
// permissions (see membership.permissions.ts) — not by role names in this file.

export interface JoinResult {
  enrollmentId: string;
  status: MembershipEnrollmentStatus;
  tenantName: string;
}

@Injectable()
export class MembershipEnrollmentService {
  constructor(private readonly dataSource: DataSource) {}

  async generateInviteLink(
    tenantId: string,
    actorUserId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const actor = await this.requirePermission(
      tenantId,
      actorUserId,
      MEMBERSHIP_PERMISSIONS.INVITE,
      "You don't have permission to invite new members.",
    );

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + DEFAULT_ENROLLMENT_EXPIRY_POLICY.inviteLinkLifetimeMs);

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

  async acceptInvite(token: string, actorUserId: string): Promise<JoinResult> {
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

      const pendingForUser = await manager.find(MembershipEnrollmentRequest, {
        where: {
          tenantId: link.tenantId,
          userId: actorUserId,
          status: MembershipEnrollmentStatus.PENDING_APPROVAL,
        },
        relations: { approvals: true },
      });
      // One that has already lapsed only still exists because the hourly
      // cleanup hasn't run yet — it must not block a fresh attempt.
      const nowForCheck = new Date();
      const existingPending = pendingForUser.some(
        (request) =>
          getEnrollmentLapse({
            createdAt: request.createdAt,
            expiresAt: request.expiresAt,
            decisions: (request.approvals ?? []).map((a) => a.decision),
            now: nowForCheck,
          }) === "none",
      );
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

      const tenant = await manager.findOne(Tenant, { where: { id: link.tenantId } });

      return {
        enrollmentId: savedEnrollment.id,
        status: savedEnrollment.status,
        tenantName: tenant?.name ?? tenant?.slug ?? "the cooperative",
      };
    });
  }

  /**
   * Staff-only — an applicant's name, contact details and approval trail
   * are for the people deciding on them, not for every member. Returns a
   * deliberately shaped response (see the mapper), and hides requests
   * that have already lapsed with no approval, which only still exist
   * because the hourly cleanup hasn't run yet.
   */
  async listPendingEnrollments(tenantId: string, actorUserId: string) {
    const actor = await this.requirePermission(
      tenantId,
      actorUserId,
      MEMBERSHIP_PERMISSIONS.APPROVE,
      "You don't have permission to see requests to join.",
    );

    const rows = await this.dataSource.getRepository(MembershipEnrollmentRequest).find({
      where: { tenantId, status: MembershipEnrollmentStatus.PENDING_APPROVAL },
      relations: { user: true, approvals: { approver: { user: true } } },
      order: { createdAt: "ASC" },
    });

    const now = new Date();

    return rows
      .filter(
        (row) =>
          getEnrollmentLapse({
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            decisions: (row.approvals ?? []).map((a) => a.decision),
            now,
          }) === "none",
      )
      .map((row) => MembershipEnrollmentResponseMapper.toResponse(row, actor.id));
  }

  async recordApproval(
    tenantId: string,
    enrollmentRequestId: string,
    actorUserId: string,
    decision: ApprovalDecision,
  ): Promise<{ id: string; status: MembershipEnrollmentStatus }> {
    return this.dataSource.transaction(async (manager) => {
      const { actor, permissions } = await this.loadActor(manager, tenantId, actorUserId);
      const isEligibleApprover = permissions.has(MEMBERSHIP_PERMISSIONS.APPROVE);

      // Lock the request row ALONE. Loading its approvals in the same query
      // makes TypeORM left-join them, and Postgres refuses FOR UPDATE on
      // the nullable side of an outer join — which made every approval
      // attempt fail. Approvals are read separately, after the lock is
      // held, so a concurrent decision still can't interleave.
      const enrollment = await manager.findOne(MembershipEnrollmentRequest, {
        where: { id: enrollmentRequestId, tenantId },
        lock: { mode: "pessimistic_write" },
      });

      if (!enrollment) {
        throw new NotFoundException("Enrollment request not found.");
      }

      const existingApprovals = await manager.find(MembershipEnrollmentApproval, {
        where: { enrollmentRequestId: enrollment.id },
      });

      const existingApproverIds = existingApprovals.map((a) => a.approverTenantUserId);

      assertCanRecordEnrollmentApproval({
        requestStatus: enrollment.status,
        isEligibleApprover,
        existingApproverIds,
        approverTenantUserId: actor.id,
      });

      if (
        getEnrollmentLapse({
          createdAt: enrollment.createdAt,
          expiresAt: enrollment.expiresAt,
          decisions: existingApprovals.map((a) => a.decision),
          now: new Date(),
        }) !== "none"
      ) {
        throw new BadRequestException(
          "This enrollment request has expired. Ask for a new invite link.",
        );
      }

      const approval = manager.create(MembershipEnrollmentApproval, {
        enrollmentRequestId: enrollment.id,
        approverTenantUserId: actor.id,
        decision,
        decidedAt: new Date(),
      });
      await manager.save(MembershipEnrollmentApproval, approval);

      const allDecisions = [...existingApprovals.map((a) => a.decision), decision];
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

      await manager.save(MembershipEnrollmentRequest, enrollment);

      return { id: enrollment.id, status: newStatus };
    });
  }

  /**
   * The scheduled cleanup job's target. Two different outcomes, per the
   * rules we agreed:
   *
   * - Never approved by anyone, invite window passed: removed outright.
   *   Nobody vouched for them, and deleting the InviteLink is enough —
   *   the enrollment and its approvals cascade-delete from it.
   * - Approved once but the second approval never came in time: marked
   *   EXPIRED, not deleted. A person did vouch for this applicant, so
   *   the record of who approved what is worth keeping, and the
   *   applicant can simply start over with a new invite link.
   *
   * Lapsed requests are already invisible and undecidable the moment
   * they lapse (see getEnrollmentLapse); this job just tidies up behind
   * that, so a delay in running it costs nothing but a few stray rows.
   */
  async cleanupExpiredEnrollments(): Promise<{ deletedInviteLinks: number; expiredEnrollments: number }> {
    const now = new Date();
    let deletedCount = 0;
    let expiredCount = 0;

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

    // Followed links whose enrollment has lapsed. The invite window
    // always closes before the longer partial-approval allowance does,
    // so every candidate for either outcome has a passed expiresAt.
    const candidates = await this.dataSource.getRepository(MembershipEnrollmentRequest).find({
      where: { status: MembershipEnrollmentStatus.PENDING_APPROVAL, expiresAt: LessThan(now) },
      relations: { approvals: true },
    });

    const inviteLinkIdsToDelete: string[] = [];
    const toExpire: MembershipEnrollmentRequest[] = [];

    for (const request of candidates) {
      const lapse = getEnrollmentLapse({
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        decisions: (request.approvals ?? []).map((a) => a.decision),
        now,
      });

      if (lapse === "no_approval_window_passed") {
        inviteLinkIdsToDelete.push(request.inviteLinkId);
      } else if (lapse === "second_approval_overdue") {
        request.status = MembershipEnrollmentStatus.EXPIRED;
        toExpire.push(request);
      }
    }

    if (inviteLinkIdsToDelete.length > 0) {
      await this.dataSource.getRepository(InviteLink).delete(inviteLinkIdsToDelete);
      deletedCount += inviteLinkIdsToDelete.length;
    }

    if (toExpire.length > 0) {
      await this.dataSource.getRepository(MembershipEnrollmentRequest).save(toExpire);
      expiredCount += toExpire.length;
    }

    return { deletedInviteLinks: deletedCount, expiredEnrollments: expiredCount };
  }

  /**
   * The actor and the permissions their roles grant RIGHT NOW, read from
   * the database rather than trusted from the sign-in token. The route
   * guard already checks the token's claims; this is the authoritative
   * second check, so taking a permission away from a role takes effect
   * on the next action instead of whenever the person's session next
   * refreshes.
   */
  private async loadActor(
    manager: EntityManager,
    tenantId: string,
    actorUserId: string,
  ): Promise<{ actor: TenantUser; permissions: Set<string> }> {
    const actor = await manager.findOne(TenantUser, {
      where: { tenantId, userId: actorUserId, isActive: true },
      relations: { roles: { role: { rolePermissions: { permission: true } } } },
    });

    if (!actor) {
      throw new ForbiddenException("You are not an active member of this tenant.");
    }

    const permissions = new Set(
      actor.roles.flatMap((assignment) =>
        (assignment.role.rolePermissions ?? []).map((grant) => grant.permission.code),
      ),
    );

    return { actor, permissions };
  }

  private async requirePermission(
    tenantId: string,
    actorUserId: string,
    permission: string,
    message: string,
  ): Promise<TenantUser> {
    const { actor, permissions } = await this.loadActor(this.dataSource.manager, tenantId, actorUserId);

    if (!permissions.has(permission)) {
      throw new ForbiddenException(message);
    }

    return actor;
  }
}
