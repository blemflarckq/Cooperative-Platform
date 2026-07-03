import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Account } from "./entities/account.entity";
import { JournalEntry } from "./entities/journal-entry.entity";
import { JournalLine } from "./entities/journal-line.entity";
import { AccountingPeriod } from "./entities/accounting-period.entity";
import { PostingEngineService } from "./posting/posting-engine.service";
import { AccountingSequence } from "./entities/accounting-sequence.entity";
import { AccountingOutboxService } from "./services/accounting-outbox.service";
import { AccountsController } from "./controllers/accounts.controller";
import { AccountsService } from "./services/accounts.service";
import { JournalEntriesController } from "./controllers/journal-entries.controller";
import { JournalEntriesService } from "./services/journal-entries.service";
import { AccountingSettings } from "./entities/accounting-settings.entity";
import { AccountingSettingsController } from "./controllers/accounting-settings.controller";
import { AccountingSettingsService } from "./services/accounting-settings.service";
import { AccountResolverService } from "./services/account-resolver.service";
import { Contribution } from "./entities/contribution.entity";
import { ContributionsController } from "./controllers/contributions.controller";
import { ContributionsService } from "./services/contributions.service";
import { SavingsStatementsController } from "./controllers/savings-statements.controller";
import { SavingsStatementsService } from "./services/savings-statements.service";
import { AccountingPeriodsController } from "./controllers/accounting-periods.controller";
import { AccountingPeriodsService } from "./services/accounting-periods.service";
import { AccountingReportsController } from "./controllers/accounting-reports.controller";
import { AccountingReportsService } from "./services/accounting-reports.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      JournalEntry,
      JournalLine,
      AccountingPeriod,
      AccountingSequence,
      AccountingSettings,
      Contribution,
    ]),
  ],
  controllers: [
    AccountsController, 
    JournalEntriesController,
    AccountingSettingsController,
    ContributionsController,
    SavingsStatementsController,
    AccountingPeriodsController,
    AccountingReportsController,
  ],

  providers: [
    PostingEngineService, 
    AccountingOutboxService,
    AccountsService,
    AccountingSettingsService,
    AccountResolverService,
    ContributionsService,
    SavingsStatementsService,
    JournalEntriesService,
    AccountingPeriodsService,
    AccountingReportsService,
  ],

  exports: [
    TypeOrmModule, 
    PostingEngineService, 
    AccountingOutboxService,
    AccountsService, 
    JournalEntriesService,
    AccountingSettingsService,
    AccountResolverService,
    ContributionsService,
    SavingsStatementsService,
    AccountingPeriodsService,
    AccountingReportsService,
  ],

})
export class AccountingModule {}