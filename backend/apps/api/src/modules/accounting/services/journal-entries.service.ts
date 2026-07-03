import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository, DataSource } from "typeorm";
import { JournalEntry } from "../entities/journal-entry.entity";
import { ListJournalEntriesQueryDto } from "../dto/journal-entries/list-journal-entries.query.dto";
import { PostingEngineService } from "../posting/posting-engine.service";
import {
  JournalEntryStatus,
  JournalLineType,
  JournalSourceModule,
} from "../enums/journal.enums";
import { AccountingOutboxService } from "./accounting-outbox.service";
import { EntityManager } from "typeorm";

@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly dataSource: DataSource,
    
    @InjectRepository(JournalEntry)
    private readonly journalEntriesRepo: Repository<JournalEntry>,

    private readonly postingEngine: PostingEngineService,
    private readonly accountingOutboxService: AccountingOutboxService,
  ) {}

  /**
   * Returns paginated journal entries for one tenant.
   *
   * We deliberately expose journal entries as read-only records.
   * Posted accounting entries are not edited directly. Corrections are
   * handled later through reversal/adjustment flows.
   */
  async findAll(
    tenantId: string,
    query: ListJournalEntriesQueryDto,
  ): Promise<[JournalEntry[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const qb = this.journalEntriesRepo
      .createQueryBuilder("entry")
      .leftJoinAndSelect("entry.lines", "line")
      .leftJoinAndSelect("line.account", "account")
      .where("entry.tenantId = :tenantId", { tenantId });

    if (query.status) {
      qb.andWhere("entry.status = :status", { status: query.status });
    }

    if (query.sourceModule) {
      qb.andWhere("entry.sourceModule = :sourceModule", {
        sourceModule: query.sourceModule,
      });
    }

    if (query.dateFrom) {
      qb.andWhere("entry.transactionDate >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("entry.transactionDate <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where("entry.entryNumber ILIKE :search", { search })
            .orWhere("entry.description ILIKE :search", { search })
            .orWhere("entry.sourceReference ILIKE :search", { search });
        }),
      );
    }

    qb.orderBy("entry.transactionDate", "DESC")
      .addOrderBy("entry.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async findOne(tenantId: string, id: string): Promise<JournalEntry> {
    const entry = await this.journalEntriesRepo.findOne({
      where: { id, tenantId },
      relations: {
        lines: {
          account: true,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException("Journal entry not found.");
    }

    return entry;
  }

  async reverse(
    tenantId: string,
    id: string,
    actorUserId: string,
    reason?: string,
  ): Promise<JournalEntry> {
    return this.dataSource.transaction((manager) =>
      this.reverseWithManager(manager, tenantId, id, actorUserId, reason),
    );
  }

  async reverseWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
    actorUserId: string,
    reason?: string,
  ): Promise<JournalEntry> {
    const original = await manager.findOne(JournalEntry, {
      where: { id, tenantId },
      relations: {
        lines: true,
      },
    });

    if (!original) {
      throw new NotFoundException("Journal entry not found.");
    }

    if (original.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException(
        "Only posted journal entries can be reversed.",
      );
    }

    if (!original.lines?.length) {
      throw new BadRequestException(
        "Journal entry has no lines and cannot be reversed.",
      );
    }

    const reversal = await this.postingEngine.postJournalEntryWithManager(
      manager,
      {
        tenantId,
        actorUserId,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `Reversal of ${original.entryNumber}${
          reason?.trim() ? `: ${reason.trim()}` : ""
        }`,
        sourceModule: JournalSourceModule.ADJUSTMENTS,
        sourceReference: original.entryNumber,
        lines: original.lines.map((line) => ({
          accountId: line.accountId,
          lineType:
            line.lineType === JournalLineType.DEBIT
              ? JournalLineType.CREDIT
              : JournalLineType.DEBIT,
          amount: line.amount,
          memo: `Reversal of ${original.entryNumber}`,
        })),
      },
    );

    original.status = JournalEntryStatus.REVERSED;
    original.reversedEntryId = reversal.id;
    original.reversedAt = new Date();
    original.reversedByUserId = actorUserId;

    const savedOriginal = await manager.save(JournalEntry, original);

    await this.accountingOutboxService.publish({
      manager,
      tenantId,
      aggregateId: savedOriginal.id,
      aggregateType: "journal_entry",
      eventType: "journal_entry.reversed.v1",
      actorUserId,
      payload: {
        originalJournalEntryId: savedOriginal.id,
        originalEntryNumber: savedOriginal.entryNumber,
        reversalJournalEntryId: reversal.id,
        reversalEntryNumber: reversal.entryNumber,
        reversedAt: savedOriginal.reversedAt,
        reason: reason?.trim() || null,
      },
    });

    return manager.findOneOrFail(JournalEntry, {
      where: { id: savedOriginal.id, tenantId },
      relations: {
        lines: {
          account: true,
        },
      },
    });
  }
}