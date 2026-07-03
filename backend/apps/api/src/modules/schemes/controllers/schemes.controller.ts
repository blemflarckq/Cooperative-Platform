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
import { SchemesService } from "../services/schemes.service";
import { CreateSchemeDto } from "../dto/schemes/create-scheme.dto";
import { UpdateSchemeDto } from "../dto/schemes/update-scheme.dto";
import { SchemeResponseMapper } from "../mappers/scheme-response.mapper";
import { ListSchemesQueryDto } from "../dto/schemes/list-schemes.query.dto";
import { toPaginatedResult } from "../../../common/dto/paginated-result";

@Controller("schemes")
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Post()
  @RequirePermissions("scheme:create")
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: CreateSchemeDto,
  ) {
    const entity = await this.schemesService.create(tenantId, dto, actorUserId);
    return SchemeResponseMapper.toResponse(entity);
  }

  @Get()
  @RequirePermissions("scheme:read")
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: ListSchemesQueryDto,
  ) {
    const [entities, total] = await this.schemesService.findAll(
      tenantId,
      query,
    );

    return toPaginatedResult(
      SchemeResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(":id")
  @RequirePermissions("scheme:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.schemesService.findOne(tenantId, id);
    return SchemeResponseMapper.toResponse(entity);
  }

  @Patch(":id")
  @RequirePermissions("scheme:update")
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSchemeDto,
  ) {
    const entity = await this.schemesService.update(tenantId, id, dto, actorUserId);
    return SchemeResponseMapper.toResponse(entity);
  }

  @Post(":id/activate")
  @RequirePermissions("scheme:activate")
  async activate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.schemesService.activate(tenantId, id, actorUserId);
    return SchemeResponseMapper.toResponse(entity);
  }

  @Post(":id/suspend")
  @RequirePermissions("scheme:suspend")
  async suspend(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.schemesService.suspend(
      tenantId,
      id,
      actorUserId,
    );

    return SchemeResponseMapper.toResponse(entity);
  }

  @Post(":id/archive")
  @RequirePermissions("scheme:archive")
  async archive(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.schemesService.archive(
      tenantId,
      id,
      actorUserId,
    );

    return SchemeResponseMapper.toResponse(entity);
  }
}
