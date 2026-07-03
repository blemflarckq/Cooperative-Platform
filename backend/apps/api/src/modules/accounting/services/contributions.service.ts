import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, EntityManager, Repository } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { CycleParticipant } from "../../schemes/entities/cycle-participant.entity";
import {
  CycleParticipantStatus,
  OperatingCycleStatus,
} from "../../schemes/enums/scheme.enums";
import { Contribution } from "../entities/contribution.entity";
import { CreateContributionDto } from "../dto/contributions/create-contribution.dto";
import {
  ContributionSource,
  ContributionStatus,
} from "../enums/contribution.enums";
import {
  JournalLineType,
  JournalSourceModule,
} from "../enums/journal.enums";
import {
  AccountResolverService,
  SystemAccountKey,
} from "./account-resolver.service";
import { PostingEngineService } from "../posting/posting-engine.service";
import { assertPositiveMoneyString } from "../../../common/validation/money";
import { AccountingSequence } from "../entities/accounting-sequence.entity";
import { AccountingOutboxService } from "./accounting-outbox.service";
import { ListContributionsQueryDto } from "../dto/contributions/list-contributions.query.dto";
import { JournalEntriesService } from "./journal-entries.service";

@Injectable()
export class ContributionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly journalEntriesService: JournalEntriesService,

    @InjectRepository(Contribution)
    private readonly contributionsRepo: Repository<Contribution>,

    private readonly accountResolver: AccountResolverService,
    private readonly postingEngine: PostingEngineService,
    private readonly accountingOutboxService: AccountingOutboxService,
  ) {}

  async createForCycle(
    tenantId: string,
    cycleId: string,
    dto: CreateContributionDto,
    actorUserId?: string,
  ): Promise<Contribution> {
    return this.dataSource.transaction(async (manager) => {
      assertPositiveMoneyString(dto.amount, "amount");

      const cycle = await manager.findOne(OperatingCycle, {
        where: {
          id: cycleId,
          tenantId,
        },
      });

      if (!cycle) {
        throw new NotFoundException("Cycle not found.");
      }

      if (cycle.status !== OperatingCycleStatus.OPEN) {
        throw new BadRequestException(
          "Contributions can only be posted to open cycles.",
        );
      }

      const tenantUser = await manager.findOne(TenantUser, {
        where: {
          id: dto.tenantUserId,
          tenantId,
          isActive: true,
          status: "active",
        },
      });

      if (!tenantUser) {
        throw new BadRequestException(
          "Tenant user is invalid, inactive, or does not belong to this tenant.",
        );
      }

      const participant = await manager.findOne(CycleParticipant, {
        where: {
          tenantId,
          cycleId,
          tenantUserId: dto.tenantUserId,
          status: CycleParticipantStatus.ACTIVE,
        },
      });

      if (!participant) {
        throw new BadRequestException(
          "Tenant user is not an active participant in this cycle.",
        );
      }

      const cashAccount = await this.accountResolver.resolveWithManager(
        manager,
        tenantId,
        SystemAccountKey.CASH,
      );

      const memberSavingsLiability =
        await this.accountResolver.resolveWithManager(
          manager,
          tenantId,
          SystemAccountKey.MEMBER_SAVINGS_LIABILITY,
        );

      const reference = await this.generateContributionReference(
        manager,
        tenantId,
      );

      const amount = Number(dto.amount).toFixed(2);

      const journalEntry = await this.postingEngine.postJournalEntryWithManager(
        manager,
        {
          tenantId,
          actorUserId,
          transactionDate: dto.contributionDate,
          description: `Contribution ${reference}`,
          sourceModule: JournalSourceModule.CONTRIBUTIONS,
          sourceReference: reference,
          lines: [
            {
              accountId: cashAccount.id,
              lineType: JournalLineType.DEBIT,
              amount,
              memo: `Cash received for contribution ${reference}`,
            },
            {
              accountId: memberSavingsLiability.id,
              lineType: JournalLineType.CREDIT,
              amount,
              memo: `Member savings liability for contribution ${reference}`,
            },
          ],
        },
      );

      let contribution = manager.create(Contribution, {
        tenantId,
        cycleId,
        tenantUserId: dto.tenantUserId,
        reference,
        contributionDate: dto.contributionDate,
        amount,
        source: dto.source ?? ContributionSource.CASH,
        status: ContributionStatus.POSTED,
        journalEntryId: journalEntry.id,
        notes: dto.notes?.trim() || null,
        reversedJournalEntryId: null,
        reversedAt: null,
        reversedByUserId: null,
      });

      contribution = await manager.save(Contribution, contribution);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: contribution.id,
        aggregateType: "contribution",
        eventType: "contribution.posted.v1",
        actorUserId,
        payload: {
          contributionId: contribution.id,
          reference: contribution.reference,
          cycleId: contribution.cycleId,
          tenantUserId: contribution.tenantUserId,
          amount: contribution.amount,
          contributionDate: contribution.contributionDate,
          source: contribution.source,
          journalEntryId: contribution.journalEntryId,
        },
      });

      return manager.findOneOrFail(Contribution, {
        where: { id: contribution.id, tenantId },
        relations: {
          tenantUser: {
            user: true,
          },
          journalEntry: true,
        },
      });
    });
  }

  async findByCycle(
    tenantId: string,
    cycleId: string,
    query: ListContributionsQueryDto,
  ): Promise<[Contribution[], number]> {
    return this.findAllScoped(tenantId, query, { cycleId });
  }

  async findByTenantUser(
    tenantId: string,
    tenantUserId: string,
    query: ListContributionsQueryDto,
  ): Promise<[Contribution[], number]> {
    return this.findAllScoped(tenantId, query, { tenantUserId });
  }

  private async generateContributionReference(
    manager: EntityManager,
    tenantId: string,
  ): Promise<string> {
    const sequenceKey = "contribution";
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
      throw new Error("Failed to initialize contribution sequence.");
    }

    sequence.currentValue += 1;

    const saved = await manager.save(AccountingSequence, sequence);

    return `CONTR-${year}-${String(saved.currentValue).padStart(6, "0")}`;
  }

  private async findAllScoped(
    tenantId: string,
    query: ListContributionsQueryDto,
    scope: {
      cycleId?: string;
      tenantUserId?: string;
    },
  ): Promise<[Contribution[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const qb = this.contributionsRepo
      .createQueryBuilder("contribution")
      .leftJoinAndSelect("contribution.tenantUser", "tenantUser")
      .leftJoinAndSelect("tenantUser.user", "user")
      .leftJoinAndSelect("contribution.journalEntry", "journalEntry")
      .where("contribution.tenantId = :tenantId", { tenantId });

    if (scope.cycleId) {
      qb.andWhere("contribution.cycleId = :cycleId", {
        cycleId: scope.cycleId,
      });
    }

    if (scope.tenantUserId) {
      qb.andWhere("contribution.tenantUserId = :tenantUserId", {
        tenantUserId: scope.tenantUserId,
      });
    }

    if (query.status) {
      qb.andWhere("contribution.status = :status", {
        status: query.status,
      });
    }

    if (query.source) {
      qb.andWhere("contribution.source = :source", {
        source: query.source,
      });
    }

    if (query.dateFrom) {
      qb.andWhere("contribution.contributionDate >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("contribution.contributionDate <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where("contribution.reference ILIKE :search", { search })
            .orWhere("user.email ILIKE :search", { search })
            .orWhere("user.firstName ILIKE :search", { search })
            .orWhere("user.lastName ILIKE :search", { search });
        }),
      );
    }

    qb.orderBy("contribution.contributionDate", "DESC")
      .addOrderBy("contribution.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }
  
  async reverse(
    tenantId: string,
    id: string,
    actorUserId: string,
    reason?: string,
    ): Promise<Contribution> {
    return this.dataSource.transaction(async (manager) => {
        const contribution = await manager.findOne(Contribution, {
        where: { id, tenantId },
        });

        if (!contribution) {
        throw new NotFoundException("Contribution not found.");
        }

        if (contribution.status === ContributionStatus.REVERSED) {
        throw new BadRequestException("Contribution has already been reversed.");
        }

        /**
         * We reverse through JournalEntriesService so the same accounting reversal
         * rules are applied everywhere:
         * - original journal entry must be POSTED
         * - debit/credit sides are inverted
         * - reversal journal is posted through PostingEngineService
         * - original journal is marked REVERSED
         */
        const reversedOriginalEntry =
        await this.journalEntriesService.reverseWithManager(
            manager,
            tenantId,
            contribution.journalEntryId,
            actorUserId,
            reason ?? `Reversal of contribution ${contribution.reference}`,
        );

        contribution.status = ContributionStatus.REVERSED;
        contribution.reversedJournalEntryId =
        reversedOriginalEntry.reversedEntryId;
        contribution.reversedAt = new Date();
        contribution.reversedByUserId = actorUserId;

        const saved = await manager.save(Contribution, contribution);

        await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "contribution",
        eventType: "contribution.reversed.v1",
        actorUserId,
        payload: {
            contributionId: saved.id,
            reference: saved.reference,
            cycleId: saved.cycleId,
            tenantUserId: saved.tenantUserId,
            amount: saved.amount,
            originalJournalEntryId: saved.journalEntryId,
            reversalJournalEntryId: saved.reversedJournalEntryId,
            reversedAt: saved.reversedAt,
            reason: reason?.trim() || null,
        },
        });

        return manager.findOneOrFail(Contribution, {
        where: { id: saved.id, tenantId },
        relations: {
            tenantUser: {
            user: true,
            },
            journalEntry: true,
        },
        });
    });
  }
}