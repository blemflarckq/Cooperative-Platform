import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { TenantUserRolesService } from '../services/tenant-user-roles.service';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { ReplaceRolesDto } from '../dto/replace-roles.dto';

import { TenantId } from '../../../common/tenancy/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/rbac/require-permissions.decorator';
import { TenantUserResponseMapper } from '../mappers/tenant-user-response.mapper';

/**
 * All three verbs need `user:assign-role` — a permission that already
 * exists and is held by administrators and treasurers. (They previously
 * asked for three `tenant_user_roles:*` codes that were never created,
 * so nobody could use them.) What a given person may actually do with it
 * is narrowed further inside the service: not your own roles, and the
 * administrator role only by an administrator.
 */
@Controller('tenant-users/:tenantUserId/roles')
export class TenantUserRolesController {
  constructor(
    private readonly tenantUserRolesService: TenantUserRolesService,
  ) {}

  @Post('assign')
  @RequirePermissions('user:assign-role')
  async assign(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: AssignRolesDto,
  ) {
    const entity = await this.tenantUserRolesService.assignRoles(
      tenantId,
      tenantUserId,
      dto.roleIds,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Post('revoke')
  @RequirePermissions('user:assign-role')
  async revoke(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: AssignRolesDto,
  ) {
    const entity = await this.tenantUserRolesService.revokeRoles(
      tenantId,
      tenantUserId,
      dto.roleIds,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Put()
  @RequirePermissions('user:assign-role')
  async replace(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: ReplaceRolesDto,
  ) {
    const entity = await this.tenantUserRolesService.replaceRoles(
      tenantId,
      tenantUserId,
      dto.roleIds,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }
}