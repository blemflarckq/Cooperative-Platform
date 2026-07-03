import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { toPaginatedResult } from "../../../common/dto/paginated-result";
import { AccountsService } from "../services/accounts.service";
import { CreateAccountDto } from "../dto/accounts/create-account.dto";
import { UpdateAccountDto } from "../dto/accounts/update-account.dto";
import { ListAccountsQueryDto } from "../dto/accounts/list-accounts.query.dto";
import { AccountResponseMapper } from "../mappers/account-response.mapper";

@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @RequirePermissions("account:create")
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: CreateAccountDto,
  ) {
    const entity = await this.accountsService.create(
      tenantId,
      dto,
      actorUserId,
    );

    return AccountResponseMapper.toResponse(entity);
  }

  @Get()
  @RequirePermissions("account:read")
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: ListAccountsQueryDto,
  ) {
    const [entities, total] = await this.accountsService.findAll(
      tenantId,
      query,
    );

    return toPaginatedResult(
      AccountResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(":id")
  @RequirePermissions("account:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.accountsService.findOne(tenantId, id);
    return AccountResponseMapper.toResponse(entity);
  }

  @Patch(":id")
  @RequirePermissions("account:update")
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const entity = await this.accountsService.update(
      tenantId,
      id,
      dto,
      actorUserId,
    );

    return AccountResponseMapper.toResponse(entity);
  }

  @Post(":id/deactivate")
  @RequirePermissions("account:deactivate")
  async deactivate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.accountsService.deactivate(
      tenantId,
      id,
      actorUserId,
    );

    return AccountResponseMapper.toResponse(entity);
  }

  @Post(":id/archive")
  @RequirePermissions("account:archive")
  async archive(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.accountsService.archive(
      tenantId,
      id,
      actorUserId,
    );

    return AccountResponseMapper.toResponse(entity);
  }
}