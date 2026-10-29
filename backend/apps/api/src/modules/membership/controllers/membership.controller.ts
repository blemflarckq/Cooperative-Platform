import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { Public } from "../../../common/auth/public.decorator";
import { SkipTenantCheck } from "../../../common/tenancy/skip-tenant-check.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { MEMBERSHIP_PERMISSIONS } from "../membership.permissions";
import { AuthService } from "../../../common/auth/auth.service";
import { MembershipEnrollmentService } from "../services/membership-enrollment.service";
import { RecordEnrollmentDecisionDto } from "../dto/record-enrollment-decision.dto";
import { JoinWithInviteDto } from "../dto/join-with-invite.dto";

@Controller("membership")
export class MembershipController {
  constructor(
    private readonly enrollmentService: MembershipEnrollmentService,
    private readonly auth: AuthService,
  ) {}

  /** The guard checks the signed-in token; the service re-checks against the database. */
  @Post("invite-links")
  @RequirePermissions(MEMBERSHIP_PERMISSIONS.INVITE)
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
   * For someone who already has a session (an access token). The target
   * tenant comes from the invite token itself, not the caller's current
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

  /**
   * For someone who has just signed in or registered but belongs to no
   * cooperative yet — which is exactly the typical invitee. Access
   * tokens are only ever issued for a tenant the person is already a
   * member of, so a brand-new person has only a pre-auth token at this
   * point; the /accept route above can't serve them. Same pattern
   * select-tenant and create-tenant already use: @Public(), with the
   * pre-auth token verified from the body.
   */
  @Public()
  @Post("invite-links/:token/join")
  async joinWithPreAuthToken(
    @Param("token") token: string,
    @Body() dto: JoinWithInviteDto,
  ) {
    const user = await this.auth.loadUserFromPreAuthToken(dto.preAuthToken);
    return this.enrollmentService.acceptInvite(token, user.id);
  }

  @Get("enrollments/pending")
  @RequirePermissions(MEMBERSHIP_PERMISSIONS.APPROVE)
  async listPendingEnrollments(
    @TenantId() tenantId: string,
    @CurrentUser("sub") actorUserId: string,
  ) {
    return this.enrollmentService.listPendingEnrollments(tenantId, actorUserId);
  }

  @Post("enrollments/:id/decision")
  @RequirePermissions(MEMBERSHIP_PERMISSIONS.APPROVE)
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
