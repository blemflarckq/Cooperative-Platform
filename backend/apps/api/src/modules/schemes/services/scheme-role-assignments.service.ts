import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, IsNull } from "typeorm";
import { SchemeRoleAssignment } from "../entities/scheme-role-assignment.entity";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { SchemeGovernanceRoleType } from "../enums/governance.enums";
import { ActorTenantUserResolverService } from "./actor-tenant-user-resolver.service";

@Injectable()
export class SchemeRoleAssignmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
  ) {}

  /**
   * Currently active role assignments for a scheme (endsAt IS NULL).
   */
  async getActiveAssignments(
    tenantId: string,
    schemeId: string,
  ): Promise<SchemeRoleAssignment[]> {
    return this.dataSource.getRepository(SchemeRoleAssignment).find({
      where: { tenantId, schemeId, endsAt: IsNull() },
      relations: { tenantUser: { user: true } },
      order: { startsAt: "ASC" },
    });
  }

  /**
   * The role types a specific person currently, actively holds in a
   * scheme — used by the approval workflow to check eligibility.
   */
  async getActiveRoleTypesForTenantUser(
    tenantId: string,
    schemeId: string,
    tenantUserId: string,
  ): Promise<SchemeGovernanceRoleType[]> {
    const assignments = await this.dataSource
      .getRepository(SchemeRoleAssignment)
      .find({
        where: {
          tenantId,
          schemeId,
          tenantUserId,
          endsAt: IsNull(),
        },
      });

    return assignments.map((assignment) => assignment.roleType);
  }

  /**
   * Assigns a new, active role to someone — does not end any existing
   * assignment. A person can hold multiple governance roles at once (e.g.
   * Treasurer and Committee Member), and this method deliberately doesn't
   * assume otherwise. Use handoverRole() for the "one person replaces
   * another" case, which is the actual rotation scenario.
   */
  async assignRole(
    tenantId: string,
    schemeId: string,
    targetTenantUserId: string,
    roleType: SchemeGovernanceRoleType,
    actorUserId: string,
  ): Promise<SchemeRoleAssignment> {
    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id: schemeId, tenantId },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      const targetTenantUser = await manager.findOne(TenantUser, {
        where: { id: targetTenantUserId, tenantId, isActive: true },
      });

      if (!targetTenantUser) {
        throw new BadRequestException(
          "Target user is invalid, inactive, or does not belong to this tenant.",
        );
      }

      const alreadyActive = await manager.findOne(SchemeRoleAssignment, {
        where: {
          tenantId,
          schemeId,
          tenantUserId: targetTenantUserId,
          roleType,
          endsAt: IsNull(),
        },
      });

      if (alreadyActive) {
        throw new BadRequestException(
          "This person already actively holds this role in this scheme.",
        );
      }

      const assignment = manager.create(SchemeRoleAssignment, {
        tenantId,
        schemeId,
        tenantUserId: targetTenantUserId,
        roleType,
        startsAt: new Date(),
        endsAt: null,
      });

      return manager.save(SchemeRoleAssignment, assignment);
    });
  }

  /**
   * Ends a specific person's active hold on a role, without assigning a
   * replacement. Existing approvals/actions taken while they held the role
   * remain historically valid — endsAt marks when the role ended, it does
   * not delete the record of them ever having held it.
   */
  async endRoleAssignment(
    tenantId: string,
    schemeId: string,
    assignmentId: string,
    actorUserId: string,
  ): Promise<SchemeRoleAssignment> {
    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const assignment = await manager.findOne(SchemeRoleAssignment, {
        where: { id: assignmentId, tenantId, schemeId },
      });

      if (!assignment) {
        throw new NotFoundException("Role assignment not found.");
      }

      if (assignment.endsAt) {
        throw new BadRequestException(
          "This role assignment has already ended.",
        );
      }

      assignment.endsAt = new Date();

      return manager.save(SchemeRoleAssignment, assignment);
    });
  }

  /**
   * The real-world "handover" moment: one person's tenure in a role ends
   * and another's begins, as a single deliberate, visible action — per the
   * roadmap's requirement that this not be a silent permission change. The
   * outgoing assignment must currently be active; both changes happen in
   * one transaction so a handover can never be left half-applied.
   */
  async handoverRole(
    tenantId: string,
    schemeId: string,
    roleType: SchemeGovernanceRoleType,
    fromTenantUserId: string,
    toTenantUserId: string,
    actorUserId: string,
  ): Promise<{ ended: SchemeRoleAssignment; started: SchemeRoleAssignment }> {
    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const outgoing = await manager.findOne(SchemeRoleAssignment, {
        where: {
          tenantId,
          schemeId,
          roleType,
          tenantUserId: fromTenantUserId,
          endsAt: IsNull(),
        },
      });

      if (!outgoing) {
        throw new BadRequestException(
          "The outgoing person does not currently, actively hold this role.",
        );
      }

      const targetTenantUser = await manager.findOne(TenantUser, {
        where: { id: toTenantUserId, tenantId, isActive: true },
      });

      if (!targetTenantUser) {
        throw new BadRequestException(
          "Incoming user is invalid, inactive, or does not belong to this tenant.",
        );
      }

      const now = new Date();
      outgoing.endsAt = now;
      const ended = await manager.save(SchemeRoleAssignment, outgoing);

      const incoming = manager.create(SchemeRoleAssignment, {
        tenantId,
        schemeId,
        tenantUserId: toTenantUserId,
        roleType,
        startsAt: now,
        endsAt: null,
      });
      const started = await manager.save(SchemeRoleAssignment, incoming);

      return { ended, started };
    });
  }
}
