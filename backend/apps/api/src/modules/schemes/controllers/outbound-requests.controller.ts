import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { OutboundRequestsService } from "../services/outbound-requests.service";
import { InitiateOutboundRequestDto } from "../dto/outbound-requests/initiate-outbound-request.dto";
import { RecordApprovalDto } from "../dto/outbound-requests/record-approval.dto";

@Controller()
export class OutboundRequestsController {
  constructor(
    private readonly outboundRequestsService: OutboundRequestsService,
  ) {}

  @Get("schemes/:schemeId/outbound-requests")
  @RequirePermissions("outbound-request:read")
  async findAll(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
  ) {
    return this.outboundRequestsService.findAllForScheme(tenantId, schemeId);
  }

  @Get("schemes/:schemeId/outbound-requests/:requestId")
  @RequirePermissions("outbound-request:read")
  async findOne(
    @TenantId() tenantId: string,
    @Param("schemeId") schemeId: string,
    @Param("requestId") requestId: string,
  ) {
    return this.outboundRequestsService.findOne(tenantId, schemeId, requestId);
  }

  @Post("schemes/:schemeId/outbound-requests")
  @RequirePermissions("outbound-request:initiate")
  async initiate(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Body() dto: InitiateOutboundRequestDto,
  ) {
    return this.outboundRequestsService.initiate(
      tenantId,
      schemeId,
      dto,
      actorUserId,
    );
  }

  @Post("schemes/:schemeId/outbound-requests/:requestId/approvals")
  @RequirePermissions("outbound-request:approve")
  async recordApproval(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("schemeId") schemeId: string,
    @Param("requestId") requestId: string,
    @Body() dto: RecordApprovalDto,
  ) {
    return this.outboundRequestsService.recordApproval(
      tenantId,
      schemeId,
      requestId,
      dto,
      actorUserId,
    );
  }
}
