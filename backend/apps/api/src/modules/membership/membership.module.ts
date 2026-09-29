import { Module } from "@nestjs/common";
import { MembershipEnrollmentService } from "./services/membership-enrollment.service";
import { MembershipEnrollmentCleanupTask } from "./services/membership-enrollment-cleanup.task";
import { MembershipController } from "./controllers/membership.controller";

/**
 * Deliberately no TypeOrmModule.forFeature() here — both services read
 * and write across identity/schemes entities via plain DataSource
 * queries, matching the same lightweight pattern the dashboard module
 * already established, rather than owning entities through module-level
 * registration.
 */
@Module({
  providers: [MembershipEnrollmentService, MembershipEnrollmentCleanupTask],
  controllers: [MembershipController],
})
export class MembershipModule {}
