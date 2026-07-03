import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, ILike, Repository } from "typeorm";
import { AccountingPeriod } from "../entities/accounting-period.entity";
import { CreateAccountingPeriodDto } from "../dto/accounting-periods/create-accounting-period.dto";
import { ListAccountingPeriodsQueryDto } from "../dto/accounting-periods/list-accounting-periods.query.dto";
import { AccountingPeriodStatus } from "../enums/accounting-period.enums";
import { AccountingOutboxService } from "./accounting-outbox.service";
import { buildPeriodCode } from "../../../common/utils/code-generator";

@Injectable()
export class AccountingPeriodsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(AccountingPeriod)
    private readonly periodsRepo: Repository<AccountingPeriod>,

    private readonly accountingOutboxService: AccountingOutboxService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAccountingPeriodDto,
    actorUserId?: string,
  ): Promise<AccountingPeriod> {
    return this.dataSource.transaction(async (manager) => {
      const code = buildPeriodCode(dto.startsOn, dto.endsOn);
      const name = dto.name.trim();

      this.assertValidDateRange(dto.startsOn, dto.endsOn);

      const existingCode = await manager.findOne(AccountingPeriod, {
        where: { tenantId, code },
      });

      if (existingCode) {
        throw new ConflictException(
          "An accounting period with this code already exists.",
        );
      }

      await this.assertNoOverlap(
        tenantId,
        dto.startsOn,
        dto.endsOn,
      );

      let period = manager.create(AccountingPeriod, {
        tenantId,
        code,
        name,
        startsOn: dto.startsOn,
        endsOn: dto.endsOn,
        status: AccountingPeriodStatus.OPEN,
        isClosed: false,
        closedAt: null,
        closedByUserId: null,
      });

      period = await manager.save(AccountingPeriod, period);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: period.id,
        aggregateType: "accounting_period",
        eventType: "accounting_period.created.v1",
        actorUserId,
        payload: {
          periodId: period.id,
          code: period.code,
          name: period.name,
          startsOn: period.startsOn,
          endsOn: period.endsOn,
          status: period.status,
        },
      });

      return period;
    });
  }

  async findAll(
    tenantId: string,
    query: ListAccountingPeriodsQueryDto,
  ): Promise<[AccountingPeriod[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search?.trim()
      ? [
          {
            tenantId,
            code: ILike(`%${query.search.trim()}%`),
            ...(query.status ? { status: query.status } : {}),
          },
          {
            tenantId,
            name: ILike(`%${query.search.trim()}%`),
            ...(query.status ? { status: query.status } : {}),
          },
        ]
      : [
          {
            tenantId,
            ...(query.status ? { status: query.status } : {}),
          },
        ];

    return this.periodsRepo.findAndCount({
      where,
      order: { startsOn: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<AccountingPeriod> {
    const period = await this.periodsRepo.findOne({
      where: { id, tenantId },
    });

    if (!period) {
      throw new NotFoundException("Accounting period not found.");
    }

    return period;
  }

  async close(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<AccountingPeriod> {
    return this.dataSource.transaction(async (manager) => {
      const period = await manager.findOne(AccountingPeriod, {
        where: { id, tenantId },
      });

      if (!period) {
        throw new NotFoundException("Accounting period not found.");
      }

      if (period.status === AccountingPeriodStatus.CLOSED) {
        return period;
      }

      period.status = AccountingPeriodStatus.CLOSED;
      period.isClosed = true;
      period.closedAt = new Date();
      period.closedByUserId = actorUserId ?? null;

      const saved = await manager.save(AccountingPeriod, period);

      await this.accountingOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "accounting_period",
        eventType: "accounting_period.closed.v1",
        actorUserId,
        payload: {
          periodId: saved.id,
          code: saved.code,
          closedAt: saved.closedAt,
          closedByUserId: saved.closedByUserId,
        },
      });

      return saved;
    });
  }

  async assertPostingDateAllowed(
    tenantId: string,
    transactionDate: string,
  ): Promise<void> {
    const period = await this.periodsRepo
      .createQueryBuilder("period")
      .where("period.tenantId = :tenantId", { tenantId })
      .andWhere("period.startsOn <= :transactionDate", { transactionDate })
      .andWhere("period.endsOn >= :transactionDate", { transactionDate })
      .getOne();

    /**
     * If no accounting period exists for the date, we currently allow posting.
     *
     * This keeps setup flexible for early tenants.
     * Later, when we introduce strict accounting mode, we can require every
     * posting date to fall inside an open accounting period.
     */
    if (!period) {
      return;
    }

    if (period.status === AccountingPeriodStatus.CLOSED || period.isClosed) {
      throw new BadRequestException(
        `Posting date ${transactionDate} falls inside closed accounting period ${period.code}.`,
      );
    }
  }

  private async assertNoOverlap(
    tenantId: string,
    startsOn: string,
    endsOn: string,
  ): Promise<void> {
    const overlap = await this.periodsRepo
      .createQueryBuilder("period")
      .where("period.tenantId = :tenantId", { tenantId })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            "period.startsOn <= :endsOn AND period.endsOn >= :startsOn",
            { startsOn, endsOn },
          );
        }),
      )
      .getOne();

    if (overlap) {
      throw new ConflictException(
        "Accounting period overlaps with an existing period.",
      );
    }
  }

  private assertValidDateRange(startsOn: string, endsOn: string): void {
    if (startsOn > endsOn) {
      throw new BadRequestException("startsOn cannot be after endsOn.");
    }
  }
}