import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { Account } from "../entities/account.entity";
import { JournalEntry } from "../entities/journal-entry.entity";
import { JournalLine } from "../entities/journal-line.entity";
import { AccountStatus } from "../enums/account.enums";
import { AccountingSequence } from "../entities/accounting-sequence.entity";
import {
  JournalEntryStatus,
  JournalLineType,
  JournalSourceModule,
} from "../enums/journal.enums";
import { AccountingOutboxService } from "../services/accounting-outbox.service";
import { AccountingPeriodsService } from "../services/accounting-periods.service";
import { validateJournalEntry, normalizeMoney } from "./journal-entry-validation";

export interface PostingLineInput {
  accountId: string;
  lineType: JournalLineType;
  amount: string;
  memo?: string | null;
}

export interface PostJournalEntryInput {
  tenantId: string;
  transactionDate: string;
  description: string;
  sourceModule: JournalSourceModule;
  sourceReference?: string | null;
  actorUserId?: string;
  lines: PostingLineInput[];
}

@Injectable()
export class PostingEngineService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accountingOutboxService: AccountingOutboxService,
    private readonly accountingPeriodsService: AccountingPeriodsService,
  ) {}

  async postJournalEntry(input: PostJournalEntryInput): Promise<JournalEntry> {
    return this.dataSource.transaction(async (manager) => {
      return this.postJournalEntryWithManager(manager, input);
    });
  }

  async postJournalEntryWithManager(
    manager: EntityManager,
    input: PostJournalEntryInput,
  ): Promise<JournalEntry> {
    validateJournalEntry(input);
    await this.accountingPeriodsService.assertPostingDateAllowed(
      input.tenantId,
      input.transactionDate,
    );

    const accountIds = [...new Set(input.lines.map((line) => line.accountId))];

    const accounts = await manager.find(Account, {
      where: {
        id: In(accountIds),
        tenantId: input.tenantId,
        status: AccountStatus.ACTIVE,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException(
        "One or more accounts are invalid, inactive, or do not belong to this tenant.",
      );
    }

    const entryNumber = await this.generateEntryNumber(
      manager,
      input.tenantId,
    );

    let entry = manager.create(JournalEntry, {
      tenantId: input.tenantId,
      entryNumber,
      transactionDate: input.transactionDate,
      description: input.description.trim(),
      status: JournalEntryStatus.POSTED,
      sourceModule: input.sourceModule,
      sourceReference: input.sourceReference?.trim() || null,
      postedByUserId: input.actorUserId ?? null,
      postedAt: new Date(),
      reversedEntryId: null,
      reversedAt: null,
      reversedByUserId: null,
    });

    entry = await manager.save(JournalEntry, entry);
    

    const lines = input.lines.map((line) =>
      manager.create(JournalLine, {
        tenantId: input.tenantId,
        journalEntryId: entry.id,
        accountId: line.accountId,
        lineType: line.lineType,
        amount: normalizeMoney(line.amount),
        memo: line.memo?.trim() || null,
      }),
    );

    await manager.save(JournalLine, lines);

    await this.accountingOutboxService.publish({
      manager,
      tenantId: input.tenantId,
      aggregateId: entry.id,
      aggregateType: "journal_entry",
      eventType: "journal_entry.posted.v1",
      actorUserId: input.actorUserId,
      payload: {
        journalEntryId: entry.id,
        entryNumber: entry.entryNumber,
        transactionDate: entry.transactionDate,
        description: entry.description,
        sourceModule: entry.sourceModule,
        sourceReference: entry.sourceReference,
        postedAt: entry.postedAt,
        postedByUserId: entry.postedByUserId,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          lineType: line.lineType,
          amount: line.amount,
          memo: line.memo,
        })),
      },
    });

    return manager.findOneOrFail(JournalEntry, {
      where: {
        id: entry.id,
        tenantId: input.tenantId,
      },
      relations: {
        lines: {
          account: true,
        },
      },
    });
  }

  private async generateEntryNumber(
    manager: EntityManager,
    tenantId: string,
  ): Promise<string> {
    const sequenceKey = "journal_entry";
    const year = new Date().getFullYear();

    await manager.query(
      `
      INSERT INTO accounting_sequences (
        id,
        "tenantId",
        "sequenceKey",
        "currentValue",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        0,
        now(),
        now()
      )
      ON CONFLICT ("tenantId", "sequenceKey") DO NOTHING
      `,
      [tenantId, sequenceKey],
    );

    const sequence = await manager.findOne(AccountingSequence, {
      where: {
        tenantId,
        sequenceKey,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!sequence) {
      throw new Error("Failed to initialize accounting sequence.");
    }

    sequence.currentValue += 1;

    const saved = await manager.save(AccountingSequence, sequence);

    return `JE-${year}-${String(saved.currentValue).padStart(6, "0")}`;
  }
}