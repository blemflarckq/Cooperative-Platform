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
import { CycleParticipantsService } from "../services/cycle-participants.service";
import { EnrollCycleParticipantDto } from "../dto/cycle-participants/enroll-cycle-participant.dto";
import { UpdateCycleParticipantDto } from "../dto/cycle-participants/update-cycle-participant.dto";
import { BulkEnrollCycleParticipantsDto } from "../dto/cycle-participants/bulk-enroll-cycle-participants.dto";
import { CycleParticipantResponseMapper } from "../mappers/cycle-participant-response.mapper";
import { ListCycleParticipantsQueryDto } from "../dto/cycle-participants/list-cycle-participants.query.dto";
import { toPaginatedResult } from "../../../common/dto/paginated-result";

@Controller()
export class CycleParticipantsController {
  constructor(
    private readonly cycleParticipantsService: CycleParticipantsService,
  ) {}

  @Post("cycles/:cycleId/participants")
  @RequirePermissions("cycle_participant:create")
  async enroll(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: EnrollCycleParticipantDto,
  ) {
    const entity = await this.cycleParticipantsService.enroll(
      tenantId,
      cycleId,
      dto,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Post("cycles/:cycleId/participants/bulk")
  @RequirePermissions("cycle_participant:create")
  async bulkEnroll(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: BulkEnrollCycleParticipantsDto,
  ) {
    const result = await this.cycleParticipantsService.bulkEnroll(
      tenantId,
      cycleId,
      dto,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toBulkResponse(result);
  }

  @Get("cycles/:cycleId/participants")
  @RequirePermissions("cycle_participant:read")
  async findByCycle(
    @TenantId() tenantId: string,
    @Param("cycleId") cycleId: string,
    @Query() query: ListCycleParticipantsQueryDto,
  ) {
    const [entities, total] =
      await this.cycleParticipantsService.findByCycle(
        tenantId,
        cycleId,
        query,
      );

    return toPaginatedResult(
      CycleParticipantResponseMapper.toList(entities),
      total,
      query.page,
      query.limit,
    );
  }

  @Get("cycle-participants/:id")
  @RequirePermissions("cycle_participant:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.cycleParticipantsService.findOne(tenantId, id);
    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Patch("cycle-participants/:id")
  @RequirePermissions("cycle_participant:update")
  async update(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCycleParticipantDto,
  ) {
    const entity = await this.cycleParticipantsService.update(
      tenantId,
      id,
      dto,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Post("cycle-participants/:id/suspend")
  @RequirePermissions("cycle_participant:suspend")
  async suspend(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.cycleParticipantsService.suspend(
      tenantId,
      id,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Post("cycle-participants/:id/reactivate")
  @RequirePermissions("cycle_participant:reactivate")
  async reactivate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.cycleParticipantsService.reactivate(
      tenantId,
      id,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Post("cycle-participants/:id/exit")
  @RequirePermissions("cycle_participant:exit")
  async exit(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.cycleParticipantsService.exit(
      tenantId,
      id,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }

  @Post("cycle-participants/:id/remove")
  @RequirePermissions("cycle_participant:remove")
  async remove(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
  ) {
    const entity = await this.cycleParticipantsService.remove(
      tenantId,
      id,
      actorUserId,
    );

    return CycleParticipantResponseMapper.toResponse(entity);
  }
}