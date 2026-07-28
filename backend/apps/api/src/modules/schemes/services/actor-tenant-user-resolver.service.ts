import { ForbiddenException, Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";

/**
 * Every governance action (initiating a request, recording an approval,
 * being assigned a role) needs to be attributed to a TenantUser, not a raw
 * User — roles and approvals are inherently scoped to a person's
 * membership within a specific tenant, matching how contributions already
 * work elsewhere in this codebase.
 *
 * But @CurrentUser() (see common/auth/current-user.decorator.ts) returns
 * the JWT's `sub` claim, which is the global User.id — not a TenantUser.id.
 * This resolves between the two, so callers never accidentally try to
 * store a User.id where a TenantUser.id is expected (which would fail a
 * foreign key constraint at the database level, or worse, silently
 * reference the wrong row if the ids ever collided).
 */
@Injectable()
export class ActorTenantUserResolverService {
  async resolve(
    manager: EntityManager,
    tenantId: string,
    actorUserId: string,
  ): Promise<TenantUser> {
    const tenantUser = await manager.findOne(TenantUser, {
      where: {
        tenantId,
        userId: actorUserId,
        isActive: true,
        status: "active",
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException(
        "Acting user is not an active member of this tenant.",
      );
    }

    return tenantUser;
  }
}
