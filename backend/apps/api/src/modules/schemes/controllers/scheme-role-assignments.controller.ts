import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { SchemeRoleAssignmentsService } from "../services/scheme-role-assignments.service";
import { AssignRoleDto } from "../dto/scheme-role-assignments/assign-role.dto";
import { HandoverRoleDto } from "../dto/scheme-role-assignments/handover-role.dto";

@Controller()
export class SchemeRoleAssignmentsController {
  constructor(
    private readonly roleAssignmentsService: SchemeRoleAssignmentsService,
  ) {}

  @Get("schemes/:schemeId/role-assignments")
  @RequirePermissions("scheme-role:read")
  async findActive(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
  ) {
    return this.roleAssignmentsService.getActiveAssignments(tenantId, schemeId);
  }

  @Post("schemes/:schemeId/role-assignments")
  @RequirePermissions("scheme-role:assign")
  async assign(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roleAssignmentsService.assignRole(
      tenantId,
      schemeId,
      dto.tenantUserId,
      dto.roleType,
      actorUserId,
    );
  }

  @Post("schemes/:schemeId/role-assignments/handover")
  @RequirePermissions("scheme-role:assign")
  async handover(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: HandoverRoleDto,
  ) {
    return this.roleAssignmentsService.handoverRole(
      tenantId,
      schemeId,
      dto.roleType,
      dto.fromTenantUserId,
      dto.toTenantUserId,
      actorUserId,
    );
  }

  @Delete("schemes/:schemeId/role-assignments/:assignmentId")
  @RequirePermissions("scheme-role:assign")
  async end(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.roleAssignmentsService.endRoleAssignment(
      tenantId,
      schemeId,
      assignmentId,
      actorUserId,
    );
  }
}
