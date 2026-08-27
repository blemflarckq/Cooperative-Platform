import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TenantUsersService } from '../services/tenant-users.service';
import { TenantContextService } from '../../../common/tenancy/tenant-context.service';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from '../dto/update-tenant-user.dto';
import { ListTenantUsersQueryDto } from '../dto/list-tenant-users.query.dto';
import { CreateTempPasswordUserDto } from '../dto/create-temp-password-user.dto';

// Replace these imports with your actual decorators/guards if names differ.
//import { TenantContext } from '../../tenancy/decorators/tenant-context.decorator';
import { TenantId } from '../../../common/tenancy/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/rbac/require-permissions.decorator';
import { TenantUserResponseMapper } from '../mappers/tenant-user-response.mapper';

@Controller('tenant-users')
export class TenantUsersController {
  constructor(
    private readonly tenantUsersService: TenantUsersService,
    private readonly tenantContextService: TenantContextService

) {}

  @Post()
  @RequirePermissions('user:create')
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    const entity = await this.tenantUsersService.createTenantUser(
      tenantId,
      dto,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Get()
  @RequirePermissions('user:read')
  async list(
    @TenantId() tenantId: string,
    @Query() query: ListTenantUsersQueryDto,
  ) {
    const rows = await this.tenantUsersService.listTenantUsers(tenantId, query);
    return rows.map(TenantUserResponseMapper.toResponse);
  }

  /**
   * Must stay registered before ':tenantUserId' below — NestJS matches
   * routes in declaration order, and 'me' would otherwise be swallowed by
   * the wildcard param route. No permission required beyond being an
   * authenticated, active tenant member — this only ever returns the
   * caller's own record.
   */
  @Get('me')
  async getCurrentTenantUser(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
  ) {
    const entity = await this.tenantUsersService.getForCurrentUser(
      tenantId,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Get(':tenantUserId')
  @RequirePermissions('user:read')
  async getOne(
    @TenantId() tenantId: string,
    @Param('tenantUserId') tenantUserId: string,
  ) {
    const entity = await this.tenantUsersService.getTenantUser(
      tenantId,
      tenantUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Patch(':tenantUserId')
  @RequirePermissions('user:update')
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    console.log('The Current TenantUser issdf', JSON.stringify(dto, null, 2));

    const entity = await this.tenantUsersService.updateTenantUser(
      tenantId,
      tenantUserId,
      dto,
      actorUserId,
    );

    return TenantUserResponseMapper.toResponse(entity);
  }

  @Delete(':tenantUserId')
  @RequirePermissions('user:deactivate')
  async deactivate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param('tenantUserId') tenantUserId: string,
  ) {
    await this.tenantUsersService.deactivateTenantUser(
      tenantId,
      tenantUserId,
      actorUserId,
    );

    return {
      success: true,
      message: 'Tenant user deactivated successfully.',
    };
  }

  @Post('temp-password')
  @RequirePermissions('user:create')
  createTempPasswordUser(
    @TenantId() tenantId: string,
    @CurrentUser('sub') actorUserId: string,
    @Body() dto: CreateTempPasswordUserDto,
  ) {
    return this.tenantUsersService.createWithTemporaryPassword({
      tenantId,
      actorUserId,
      dto,
    });
  }
}