import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LoanRateScheduleService } from "./loan-rate-schedule.service";

/**
 * Daily rather than monthly on purpose: a PERIODS loan changes stage on
 * its own anniversary, which falls on any day, and a RAMP loan's monthly
 * step is measured from its own disbursement date. Running daily means a
 * rate moves within a day of when it should — and since each run only
 * acts on loans that are actually due, a run with nothing due is cheap.
 */
@Injectable()
export class LoanRateScheduleTask {
  private readonly logger = new Logger(LoanRateScheduleTask.name);

  constructor(private readonly scheduleService: LoanRateScheduleService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRun(): Promise<void> {
    const summary = await this.scheduleService.applyDueRates();

    if (summary.changed > 0 || summary.failed > 0 || summary.skipped > 0) {
      this.logger.log(
        `Loan rates: ${summary.examined} examined, ${summary.changed} updated (${summary.newlyFlagged} newly flagged), ${summary.skipped} skipped, ${summary.failed} failed.`,
      );
    }
  }
}
