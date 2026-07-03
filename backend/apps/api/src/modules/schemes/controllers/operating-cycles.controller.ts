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
import { OperatingCyclesService } from "../services/operating-cycles.service";
import { CreateOperatingCycleDto } from "../dto/operating-cycles/create-operating-cycle.dto";
import { UpdateOperatingCycleDto } from "../dto/operating-cycles/update-operating-cycle.dto";
import { OperatingCycleResponseMapper } from "../mappers/operating-cycle-response.mapper";
import { ListOperatingCyclesQueryDto } from "../dto/operating-cycles/list-operating-cycles.query.dto";
import { toPaginatedResult } from "../../../common/dto/paginated-result";

@Controller()
export class OperatingCyclesController {
  constructor(
    private readonly operatingCyclesService: OperatingCyclesService,
  ) {}

  @Post("schemes/:schemeId/cycles")
  @RequirePermissions("cycle:create")
  async createForScheme(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: CreateOperatingCycleDto,
  ) {
    const entity = await this.operatingCyclesService.createForScheme(
      tenantId,
      schemeId,
      dto,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Get("schemes/:schemeId/cycles")
  @RequirePermissions("cycle:read")
  async findByScheme(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
    @Query() query: ListOperatingCyclesQueryDto,
  ) {
    const [entities, total] =
      await this.operatingCyclesService.findByScheme(
        tenantId,
        schemeId,
        query,
      );

    return toPaginatedResult(
      OperatingCycleResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get("cycles/:id")
  @RequirePermissions("cycle:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.operatingCyclesService.findOne(tenantId, id);
    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Patch("cycles/:id")
  @RequirePermissions("cycle:update")
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOperatingCycleDto,
  ) {
    const entity = await this.operatingCyclesService.update(
      tenantId,
      id,
      dto,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Post("cycles/:id/open")
  @RequirePermissions("cycle:open")
  async open(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.operatingCyclesService.open(
      tenantId,
      id,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Post("cycles/:id/pause")
  @RequirePermissions("cycle:pause")
  async pause(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.operatingCyclesService.pause(
      tenantId,
      id,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Post("cycles/:id/close")
  @RequirePermissions("cycle:close")
  async close(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.operatingCyclesService.close(
      tenantId,
      id,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }

  @Post("cycles/:id/cancel")
  @RequirePermissions("cycle:cancel")
  async cancel(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.operatingCyclesService.cancel(
      tenantId,
      id,
      actorUserId,
    );

    return OperatingCycleResponseMapper.toResponse(entity);
  }
}