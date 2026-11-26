import { Controller, Get } from '@nestjs/common';
import { TenantId } from '../../../common/tenancy/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/rbac/require-permissions.decorator';
import { TenantUserRolesService } from '../services/tenant-user-roles.service';

/**
 * The roles a cooperative has, for the screens that let someone give
 * them out. Each comes marked with whether the person asking may give or
 * remove it, with the reason in plain words when they may not — so the
 * screen can say so instead of failing after the tap.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly tenantUserRolesService: TenantUserRolesService) {}

  @Get()
  @RequirePermissions('role:read')
  list(@TenantId() tenantId: string, @CurrentUser('sub') actorUserId: string) {
    return this.tenantUserRolesService.listAssignableRoles(tenantId, actorUserId);
  }
}
