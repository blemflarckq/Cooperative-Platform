import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { toPaginatedResult } from "../../../common/dto/paginated-result";
import { AccountingPeriodsService } from "../services/accounting-periods.service";
import { CreateAccountingPeriodDto } from "../dto/accounting-periods/create-accounting-period.dto";
import { ListAccountingPeriodsQueryDto } from "../dto/accounting-periods/list-accounting-periods.query.dto";
import { AccountingPeriodResponseMapper } from "../mappers/accounting-period-response.mapper";

@Controller("accounting-periods")
export class AccountingPeriodsController {
  constructor(
    private readonly accountingPeriodsService: AccountingPeriodsService,
  ) {}

  @Post()
  @RequirePermissions("accounting_period:create")
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: CreateAccountingPeriodDto,
  ) {
    const entity = await this.accountingPeriodsService.create(
      tenantId,
      dto,
      actorUserId,
    );

    return AccountingPeriodResponseMapper.toResponse(entity);
  }

  @Get()
  @RequirePermissions("accounting_period:read")
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: ListAccountingPeriodsQueryDto,
  ) {
    const [entities, total] = await this.accountingPeriodsService.findAll(
      tenantId,
      query,
    );

    return toPaginatedResult(
      AccountingPeriodResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(":id")
  @RequirePermissions("accounting_period:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.accountingPeriodsService.findOne(tenantId, id);
    return AccountingPeriodResponseMapper.toResponse(entity);
  }

  @Post(":id/close")
  @RequirePermissions("accounting_period:close")
  async close(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.accountingPeriodsService.close(
      tenantId,
      id,
      actorUserId,
    );

    return AccountingPeriodResponseMapper.toResponse(entity);
  }
}