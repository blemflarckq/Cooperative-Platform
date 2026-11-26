import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { Role } from '../entities/role.entity';
import { IdentityOutboxService } from './identity-outbox.service';
import {
  countOtherActiveAdmins,
  loadActor,
  lockCooperative,
  throwViolation,
} from './tenant-user-governance';
import {
  ADMIN_ROLE_CODE,
  ADMIN_ROLE_LOCKED_REASON,
  checkRoleChange,
  compareRolesForDisplay,
} from './tenant-user-rules';

type ChangeMode = 'assign' | 'revoke' | 'replace';

export interface AssignableRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  /** False when the person asking is not allowed to give or remove this role. */
  canAssign: boolean;
  /** Plain-language reason, shown in place of the control. Null when canAssign. */
  lockedReason: string | null;
}

/**
 * Changing a member's roles. Three entry points (add, remove, replace)
 * share one guarded path so the rules in tenant-user-rules.ts can't be
 * bypassed by choosing a different verb. Who may do it is decided twice:
 * the controller requires `user:assign-role`, and here the actor is
 * re-read from the database inside the transaction — a stale token never
 * decides who may grant authority.
 *
 * Role changes reach the person's session when their access token next
 * refreshes (within about 15 minutes) — permissions travel in the token.
 */
@Injectable()
export class TenantUserRolesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly identityOutboxService: IdentityOutboxService,
  ) {}

  assignRoles(tenantId: string, tenantUserId: string, roleIds: string[], actorUserId?: string) {
    return this.change('assign', tenantId, tenantUserId, roleIds, actorUserId);
  }

  revokeRoles(tenantId: string, tenantUserId: string, roleIds: string[], actorUserId?: string) {
    return this.change('revoke', tenantId, tenantUserId, roleIds, actorUserId);
  }

  replaceRoles(tenantId: string, tenantUserId: string, roleIds: string[], actorUserId?: string) {
    return this.change('replace', tenantId, tenantUserId, roleIds, actorUserId);
  }

  /**
   * The roles this cooperative has, each marked with whether the person
   * asking may give or remove it — so the screen can say why a role is
   * out of reach instead of hiding it or failing after the tap.
   */
  async listAssignableRoles(tenantId: string, actorUserId?: string): Promise<AssignableRole[]> {
    const actor = await loadActor(this.dataSource.manager, tenantId, actorUserId);
    const actorIsAdmin = actor.roleCodes.includes(ADMIN_ROLE_CODE);

    const roles = await this.dataSource.manager.find(Role, {
      where: { tenantId, isActive: true },
    });

    return roles.sort(compareRolesForDisplay).map((role) => {
      const locked = role.code === ADMIN_ROLE_CODE && !actorIsAdmin;
      return {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        canAssign: !locked,
        lockedReason: locked ? ADMIN_ROLE_LOCKED_REASON : null,
      };
    });
  }

  private async change(
    mode: ChangeMode,
    tenantId: string,
    tenantUserId: string,
    requestedRoleIds: string[],
    actorUserId?: string,
  ): Promise<TenantUser> {
    return await this.dataSource.transaction(async (manager) => {
      await lockCooperative(manager, tenantId);

      const tenantUser = await manager.findOne(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: { user: true },
      });
      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

      const actor = await loadActor(manager, tenantId, actorUserId);

      const requestedRoles = await this.loadRequestedRoles(
        manager,
        tenantId,
        mode,
        requestedRoleIds,
      );

      const currentRows = await manager.find(TenantUserRole, { where: { tenantUserId } });
      const currentIds = new Set(currentRows.map((row) => row.roleId));
      const requestedIds = new Set(requestedRoles.map((role) => role.id));

      const nextIds = this.nextRoleIds(mode, currentIds, requestedIds);

      // Codes for the before/after, from the roles we hold in hand: the
      // person's current roles plus whatever was asked for.
      const codeById = new Map<string, string>();
      for (const row of currentRows) codeById.set(row.roleId, row.role.code);
      for (const role of requestedRoles) codeById.set(role.id, role.code);

      const currentCodes = [...currentIds].map((id) => codeById.get(id)!);
      const nextCodes = [...nextIds].map((id) => codeById.get(id)!);

      const violation = checkRoleChange({
        actorTenantUserId: actor.tenantUserId,
        targetTenantUserId: tenantUser.id,
        actorRoleCodes: actor.roleCodes,
        targetCurrentRoleCodes: currentCodes,
        targetNextRoleCodes: nextCodes,
        targetIsActive: tenantUser.isActive !== false,
        otherActiveAdmins: await countOtherActiveAdmins(manager, tenantId, tenantUser.id),
      });
      if (violation) throwViolation(violation);

      const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

      if (toRemove.length > 0) {
        await manager.delete(TenantUserRole, { tenantUserId, roleId: In(toRemove) });
      }
      if (toAdd.length > 0) {
        await manager.save(
          TenantUserRole,
          toAdd.map((roleId) => manager.create(TenantUserRole, { tenantUserId, roleId })),
        );
      }

      // Nothing changed → nothing to announce. An event per no-op would
      // make the audit trail say things happened that did not.
      if (toAdd.length > 0 || toRemove.length > 0) {
        await this.identityOutboxService.publish({
          manager,
          tenantId,
          aggregateId: tenantUserId,
          aggregateType: 'tenant_user',
          eventType: `identity.tenant_user.roles.${
            mode === 'assign' ? 'assigned' : mode === 'revoke' ? 'revoked' : 'replaced'
          }.v1`,
          actorUserId,
          payload: {
            tenantUserId,
            userId: tenantUser.user.id,
            roleIds: requestedRoleIds,
            previousRoleCodes: currentCodes,
            roleCodes: nextCodes,
          },
        });
      }

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: { user: true, roles: { role: true } },
      });
    });
  }

  /**
   * Adding or replacing needs every role to exist, be active, and belong
   * to this cooperative. Removing is looser: a role that has since been
   * switched off must still be removable from the people who hold it.
   */
  private async loadRequestedRoles(
    manager: EntityManager,
    tenantId: string,
    mode: ChangeMode,
    roleIds: string[],
  ): Promise<Role[]> {
    if (roleIds.length === 0) return [];

    const roles = await manager.find(Role, {
      where:
        mode === 'revoke'
          ? { id: In(roleIds), tenantId }
          : { id: In(roleIds), tenantId, isActive: true },
    });

    if (mode !== 'revoke' && roles.length !== new Set(roleIds).size) {
      throw new BadRequestException('One or more roles are invalid or belong to another cooperative.');
    }

    return roles;
  }

  private nextRoleIds(
    mode: ChangeMode,
    current: Set<string>,
    requested: Set<string>,
  ): Set<string> {
    switch (mode) {
      case 'assign':
        return new Set([...current, ...requested]);
      case 'revoke':
        return new Set([...current].filter((id) => !requested.has(id)));
      case 'replace':
        return new Set(requested);
    }
  }
}
