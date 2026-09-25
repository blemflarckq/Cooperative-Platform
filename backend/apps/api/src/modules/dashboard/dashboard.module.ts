import { Module } from "@nestjs/common";
import { AdminDashboardService } from "./services/admin-dashboard.service";
import { MemberDashboardService } from "./services/member-dashboard.service";
import { DashboardController } from "./controllers/dashboard.controller";

/**
 * Deliberately no TypeOrmModule.forFeature() here — both dashboard
 * services read across schemes/loans/tenant-users/outbound-requests via
 * plain DataSource queries rather than owning any of those entities, so
 * they don't need module-level entity registration the way a service
 * that writes to an entity would.
 */
@Module({
  providers: [AdminDashboardService, MemberDashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
