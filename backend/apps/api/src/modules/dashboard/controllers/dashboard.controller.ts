import { Controller, Get, ForbiddenException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { AdminDashboardService } from "../services/admin-dashboard.service";
import { MemberDashboardService } from "../services/member-dashboard.service";
import { TenantUser } from "../../identity/entities/tenant-user.entity";

@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly memberDashboardService: MemberDashboardService,
  ) {}

  /**
   * Gated by accounting_settings:update — an existing permission already
   * held only by tenant_admin and treasurer, reused here rather than
   * inventing a new one for a case an existing one already covers
   * correctly.
   */
  @Get("admin")
  @RequirePermissions("accounting_settings:update")
  async getAdminDashboard(@TenantId() tenantId: string) {
    return this.adminDashboardService.getAdminDashboard(tenantId);
  }

  /**
   * Available to any authenticated tenant member — this is fundamentally
   * self-service, showing the caller only their own schemes and action
   * items. Resolves the JWT's raw userId to a TenantUser inline, the
   * same lightweight DataSource-only pattern the rest of this module
   * uses rather than importing IdentityModule for one lookup.
   */
  @Get("member")
  async getMemberDashboard(
    @TenantId() tenantId: string,
    @CurrentUser("sub") actorUserId: string,
  ) {
    const tenantUser = await this.dataSource.getRepository(TenantUser).findOne({
      where: { tenantId, userId: actorUserId, isActive: true },
    });

    if (!tenantUser) {
      throw new ForbiddenException("You are not an active member of this tenant.");
    }

    return this.memberDashboardService.getMemberDashboard(tenantId, tenantUser.id);
  }
}
