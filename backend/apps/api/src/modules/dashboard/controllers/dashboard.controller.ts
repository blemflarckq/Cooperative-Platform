import { Controller, Get } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { AdminDashboardService } from "../services/admin-dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

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
}
