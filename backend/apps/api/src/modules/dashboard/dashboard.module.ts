import { Module } from "@nestjs/common";
import { AdminDashboardService } from "./services/admin-dashboard.service";
import { DashboardController } from "./controllers/dashboard.controller";

/**
 * Deliberately no TypeOrmModule.forFeature() here — AdminDashboardService
 * reads across schemes/loans/tenant-users/outbound-requests via plain
 * DataSource queries rather than owning any of those entities, so it
 * doesn't need module-level entity registration the way a service that
 * writes to an entity would.
 */
@Module({
  providers: [AdminDashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
