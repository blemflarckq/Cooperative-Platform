import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { ADMIN_ROLE_CODE, checkInitialRoles, RuleViolation } from './tenant-user-rules';

/**
 * The database half of the member-governance rules: gathering the facts
 * that tenant-user-rules.ts judges. Everything here runs on the caller's
 * transaction manager so the facts and the change they justify are read
 * and written under the same lock.
 */

/**
 * Serialises governance changes within one cooperative. Without it, two
 * administrators demoting each other at the same moment would each see
 * "another administrator exists" and both succeed, leaving none. The
 * lock is held only for the length of the transaction, and these actions
 * are rare, so the cost is nil.
 */
export async function lockCooperative(manager: EntityManager, tenantId: string): Promise<void> {
  await manager.findOne(Tenant, {
    where: { id: tenantId },
    lock: { mode: 'pessimistic_write' },
  });
}

export interface Actor {
  tenantUserId: string;
  roleCodes: string[];
}

/**
 * Who is acting, as the database knows them right now — their roles from
 * the database, not from the token. Anyone who is not an active member
 * of this cooperative cannot change anything in it, whatever their
 * (possibly stale) token still says.
 */
export async function loadActor(
  manager: EntityManager,
  tenantId: string,
  actorUserId: string | undefined,
): Promise<Actor> {
  const membership = actorUserId
    ? await manager.findOne(TenantUser, {
        where: { tenantId, userId: actorUserId, isActive: true },
      })
    : null;

  if (!membership) {
    throw new ForbiddenException('You are not an active member of this cooperative.');
  }

  return { tenantUserId: membership.id, roleCodes: await loadRoleCodes(manager, membership.id) };
}

/** Codes of the active roles a membership holds. */
export async function loadRoleCodes(
  manager: EntityManager,
  tenantUserId: string,
): Promise<string[]> {
  const rows = await manager.find(TenantUserRole, { where: { tenantUserId } });
  return rows.filter((row) => row.role?.isActive).map((row) => row.role.code);
}

/**
 * How many OTHER active administrators the cooperative has. "Active"
 * means both the membership and the person's account are switched on —
 * an administrator who can't sign in is not one the cooperative can rely on.
 */
export async function countOtherActiveAdmins(
  manager: EntityManager,
  tenantId: string,
  excludeTenantUserId: string,
): Promise<number> {
  return await manager
    .createQueryBuilder(TenantUser, 'tu')
    .innerJoin('tu.user', 'u')
    .innerJoin(TenantUserRole, 'tur', 'tur.tenantUserId = tu.id')
    .innerJoin('tur.role', 'r')
    .where('tu.tenantId = :tenantId', { tenantId })
    .andWhere('tu.id <> :excludeTenantUserId', { excludeTenantUserId })
    .andWhere('tu.isActive = true')
    .andWhere('u.isActive = true')
    .andWhere('r.code = :code', { code: ADMIN_ROLE_CODE })
    .andWhere('r.isActive = true')
    .getCount();
}

/**
 * For the paths that create a member with roles already attached. Only
 * costs anything when the administrator role is among them; everything
 * else is already covered by the route's own permission.
 */
export async function assertMayGrantInitialRoles(
  manager: EntityManager,
  tenantId: string,
  actorUserId: string | undefined,
  roles: ReadonlyArray<{ code: string }>,
): Promise<void> {
  if (!roles.some((role) => role.code === ADMIN_ROLE_CODE)) return;

  const actor = await loadActor(manager, tenantId, actorUserId);
  const violation = checkInitialRoles({
    actorRoleCodes: actor.roleCodes,
    grantedRoleCodes: roles.map((role) => role.code),
  });
  if (violation) throwViolation(violation);
}

/** Turns a rule's refusal into the right HTTP error, message untouched. */
export function throwViolation(violation: RuleViolation): never {
  switch (violation.kind) {
    case 'forbidden':
      throw new ForbiddenException(violation.message);
    case 'conflict':
      throw new ConflictException(violation.message);
    default:
      throw new BadRequestException(violation.message);
  }
}
