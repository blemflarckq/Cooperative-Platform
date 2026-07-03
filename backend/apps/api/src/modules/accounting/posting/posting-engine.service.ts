import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
import { assertPositiveMoneyString } from "../../../common/validation/money";
import { AccountingOutboxService } from "../services/accounting-outbox.service";
import { AccountingPeriodsService } from "../services/accounting-periods.service";

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
    this.validatePostingInput(input);
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
        amount: this.normalizeMoney(line.amount),
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

  private validatePostingInput(input: PostJournalEntryInput): void {
    if (!input.tenantId) {
      throw new BadRequestException("tenantId is required.");
    }

    if (!input.transactionDate) {
      throw new BadRequestException("transactionDate is required.");
    }

    if (!input.description?.trim()) {
      throw new BadRequestException("description is required.");
    }

    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException(
        "A journal entry requires at least two lines.",
      );
    }

    let debitTotal = 0;
    let creditTotal = 0;

    for (const line of input.lines) {
      if (!line.accountId) {
        throw new BadRequestException("Each journal line requires accountId.");
      }

      if (
        line.lineType !== JournalLineType.DEBIT &&
        line.lineType !== JournalLineType.CREDIT
      ) {
        throw new BadRequestException(
          "Each journal line must be either DEBIT or CREDIT.",
        );
      }

      assertPositiveMoneyString(line.amount, "line amount");

      const amount = Number(this.normalizeMoney(line.amount));

      if (line.lineType === JournalLineType.DEBIT) {
        debitTotal += amount;
      } else {
        creditTotal += amount;
      }
    }

    if (debitTotal <= 0 || creditTotal <= 0) {
      throw new BadRequestException(
        "Journal entry requires both debit and credit lines.",
      );
    }

    if (this.toCents(debitTotal) !== this.toCents(creditTotal)) {
      throw new BadRequestException(
        "Journal entry is not balanced. Total debits must equal total credits.",
      );
    }
  }

  private normalizeMoney(value: string): string {
    return Number(value).toFixed(2);
  }

  private toCents(value: number): number {
    return Math.round(value * 100);
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