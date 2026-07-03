import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { ContributionsService } from "../services/contributions.service";
import { CreateContributionDto } from "../dto/contributions/create-contribution.dto";
import { ContributionResponseMapper } from "../mappers/contribution-response.mapper";
import { toPaginatedResult } from "../../../common/dto/paginated-result";
import { ListContributionsQueryDto } from "../dto/contributions/list-contributions.query.dto";
import { ReverseContributionDto } from "../dto/contributions/reverse-contribution.dto";

@Controller()
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post("cycles/:cycleId/contributions")
  @RequirePermissions("contribution:create")
  async createForCycle(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: CreateContributionDto,
  ) {
    const entity = await this.contributionsService.createForCycle(
      tenantId,
      cycleId,
      dto,
      actorUserId,
    );

    return ContributionResponseMapper.toResponse(entity);
  }

  @Get("cycles/:cycleId/contributions")
  @RequirePermissions("contribution:read")
  async findByCycle(
    @TenantId() tenantId: string,
    @Param("cycleId") cycleId: string,
    @Query() query: ListContributionsQueryDto,
  ) {
    const [entities, total] = await this.contributionsService.findByCycle(
      tenantId,
      cycleId,
      query,
    );

    return toPaginatedResult(
      ContributionResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get("tenant-users/:tenantUserId/contributions")
  @RequirePermissions("contribution:read")
  async findByTenantUser(
    @TenantId() tenantId: string,
    @Param("tenantUserId") tenantUserId: string,
    @Query() query: ListContributionsQueryDto,
  ) {
    const [entities, total] = await this.contributionsService.findByTenantUser(
      tenantId,
      tenantUserId,
      query,
    );

    return toPaginatedResult(
      ContributionResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Post("contributions/:id/reverse")
  @RequirePermissions("contribution:reverse")
  async reverse(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: ReverseContributionDto,
  ) {
    const entity = await this.contributionsService.reverse(
      tenantId,
      id,
      actorUserId,
      dto.reason,
    );

    return ContributionResponseMapper.toResponse(entity);
  }
}