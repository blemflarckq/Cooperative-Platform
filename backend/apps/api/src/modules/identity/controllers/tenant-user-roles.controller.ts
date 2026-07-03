import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { TenantUserRolesService } from '../services/tenant-user-roles.service';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { ReplaceRolesDto } from '../dto/replace-roles.dto';

// Replace these imports with your actual decorators/guards if names differ.
import { TenantId } from '../../../common/tenancy/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/rbac/require-permissions.decorator';
import { TenantUserResponseMapper } from '../mappers/tenant-user-response.mapper';

@Controller('tenant-users/:tenantUserId/roles')
export class TenantUserRolesController {
  constructor(
    private readonly tenantUserRolesService: TenantUserRolesService,
  ) {}

  @Post('assign')
  @RequirePermissions('tenant_user_roles:assign')
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
  @RequirePermissions('tenant_user_roles:revoke')
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
  @RequirePermissions('tenant_user_roles:replace')
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