import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { LoanPolicyService } from "../services/loan-policy.service";
import { UpsertLoanPolicyDto } from "../dto/upsert-loan-policy.dto";

@Controller()
export class LoanPolicyController {
  constructor(private readonly loanPolicyService: LoanPolicyService) {}

  @Get("schemes/:schemeId/loan-policy")
  @RequirePermissions("loan-policy:read")
  async getForScheme(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
  ) {
    return this.loanPolicyService.getForScheme(tenantId, schemeId);
  }

  @Put("schemes/:schemeId/loan-policy")
  @RequirePermissions("loan-policy:manage")
  async upsert(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: UpsertLoanPolicyDto,
  ) {
    return this.loanPolicyService.upsert(tenantId, schemeId, dto, actorUserId);
  }
}
