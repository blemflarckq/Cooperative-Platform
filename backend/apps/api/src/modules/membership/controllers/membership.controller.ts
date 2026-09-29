import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { Public } from "../../../common/auth/public.decorator";
import { SkipTenantCheck } from "../../../common/tenancy/skip-tenant-check.decorator";
import { MembershipEnrollmentService } from "../services/membership-enrollment.service";
import { RecordEnrollmentDecisionDto } from "../dto/record-enrollment-decision.dto";

@Controller("membership")
export class MembershipController {
  constructor(private readonly enrollmentService: MembershipEnrollmentService) {}

  /**
   * Staff-only, enforced inside the service (tenant_admin/treasurer) —
   * not a @RequirePermissions() check here, since this doesn't map to an
   * existing permission and inventing one for a single call site wasn't
   * worth it next to the service already doing this check directly.
   */
  @Post("invite-links")
  async generateInviteLink(
    @TenantId() tenantId: string,
    @CurrentUser("sub") actorUserId: string,
  ) {
    return this.enrollmentService.generateInviteLink(tenantId, actorUserId);
  }

  @Public()
  @Get("invite-links/:token")
  async getInviteLinkPreview(@Param("token") token: string) {
    return this.enrollmentService.getInviteLinkPreview(token);
  }

  /**
   * Requires real authentication (so NOT @Public()) but the target
   * tenant comes from the token itself, not the caller's current
   * session — see SkipTenantCheck for why the normal X-Tenant-Id rule
   * doesn't apply here.
   */
  @SkipTenantCheck()
  @Post("invite-links/:token/accept")
  async acceptInvite(
    @Param("token") token: string,
    @CurrentUser("sub") actorUserId: string,
  ) {
    return this.enrollmentService.acceptInvite(token, actorUserId);
  }

  @Get("enrollments/pending")
  async listPendingEnrollments(@TenantId() tenantId: string) {
    return this.enrollmentService.listPendingEnrollments(tenantId);
  }

  @Post("enrollments/:id/decision")
  async recordDecision(
    @TenantId() tenantId: string,
    @Param("id") enrollmentRequestId: string,
    @CurrentUser("sub") actorUserId: string,
    @Body() dto: RecordEnrollmentDecisionDto,
  ) {
    return this.enrollmentService.recordApproval(
      tenantId,
      enrollmentRequestId,
      actorUserId,
      dto.decision,
    );
  }
}
