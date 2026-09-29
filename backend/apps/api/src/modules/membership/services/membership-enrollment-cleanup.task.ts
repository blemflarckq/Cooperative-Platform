import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MembershipEnrollmentService } from "./membership-enrollment.service";

/**
 * The first real use of @nestjs/schedule in this codebase — genuinely
 * new infrastructure, not an extension of something that already
 * existed. Runs hourly rather than, say, daily: with a 4-hour invite
 * window, an hourly check keeps an expired-and-unapproved record from
 * lingering more than an hour past its actual deadline, which feels
 * right for a control tied to something this short-lived.
 *
 * This same infrastructure is what the pinned loan rate-escalation
 * scheduler (currently manual-trigger-only) should eventually run on
 * too — deliberately not wired up as part of this change, since that
 * needs its own explicit decision about escalation cadence first,
 * rather than a guessed rule bundled in here.
 */
@Injectable()
export class MembershipEnrollmentCleanupTask {
  private readonly logger = new Logger(MembershipEnrollmentCleanupTask.name);

  constructor(private readonly enrollmentService: MembershipEnrollmentService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const { deletedInviteLinks } = await this.enrollmentService.cleanupExpiredEnrollments();

    if (deletedInviteLinks > 0) {
      this.logger.log(`Cleaned up ${deletedInviteLinks} expired invite link(s).`);
    }
  }
}
