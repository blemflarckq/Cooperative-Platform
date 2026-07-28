import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { ApprovalPolicyService } from "../services/approval-policy.service";
import { UpsertApprovalPolicyDto } from "../dto/approval-policy/upsert-approval-policy.dto";

@Controller()
export class ApprovalPolicyController {
  constructor(private readonly approvalPolicyService: ApprovalPolicyService) {}

  @Get("schemes/:schemeId/approval-policy")
  @RequirePermissions("approval-policy:read")
  async getForScheme(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
  ) {
    return this.approvalPolicyService.getForScheme(tenantId, schemeId);
  }

  @Put("schemes/:schemeId/approval-policy")
  @RequirePermissions("approval-policy:manage")
  async upsert(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: UpsertApprovalPolicyDto,
  ) {
    return this.approvalPolicyService.upsert(tenantId, schemeId, dto, actorUserId);
  }
}
