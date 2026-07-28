import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike } from "typeorm";
import { DataSource, Repository } from "typeorm";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { OperatingCycle } from "../entities/operating-cycle.entity";
import { CreateOperatingCycleDto } from "../dto/operating-cycles/create-operating-cycle.dto";
import { UpdateOperatingCycleDto } from "../dto/operating-cycles/update-operating-cycle.dto";
import { ListOperatingCyclesQueryDto } from "../dto/operating-cycles/list-operating-cycles.query.dto";
import {
  CycleMode,
  OperatingCycleStatus,
  SchemeStatus,
} from "../enums/scheme.enums";
import { SchemesOutboxService } from "./schemes-outbox.service";
import { assertPositiveMoneyString } from "../../../common/validation/money";
import { slugifyCode } from "../../../common/utils/code-generator";

@Injectable()
export class OperatingCyclesService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(OperatingCycle)
    private readonly cyclesRepo: Repository<OperatingCycle>,

    private readonly schemesOutboxService: SchemesOutboxService,
  ) {}

  async createForScheme(
    tenantId: string,
    schemeId: string,
    dto: CreateOperatingCycleDto,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await manager.findOne(CooperativeScheme, {
        where: {
          id: schemeId,
          tenantId,
          isActive: true,
        },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      if (scheme.status !== SchemeStatus.ACTIVE) {
        throw new BadRequestException(
          "Cycles can only be created under an active scheme.",
        );
      }

      this.validateCycleDatesForMode(
        scheme.cycleMode,
        dto.startsOn ?? null,
        dto.endsOn ?? null,
      );

      this.validateTargetForMode(
        scheme.cycleMode,
        dto.targetAmount ?? null,
      );

      const name = dto.name.trim();
      const code = dto.code?.trim()
        ? slugifyCode(dto.code)
        : slugifyCode(dto.name);

      const existing = await manager.findOne(OperatingCycle, {
        where: [
          { tenantId, schemeId, name },
          { tenantId, schemeId, code },
        ],
      });

      if (existing) {
        throw new ConflictException(
          "A cycle with this name or code already exists under this scheme.",
        );
      }
      const targetAmount = dto.targetAmount?.trim() || null;
      this.validateTargetForMode(scheme.cycleMode, targetAmount);

      let cycle = manager.create(OperatingCycle, {
        tenantId,
        schemeId,
        name,
        code,
        description: dto.description?.trim() || null,
        status: OperatingCycleStatus.DRAFT,
        startsOn: dto.startsOn ?? null,
        endsOn: dto.endsOn ?? null,
        targetAmount,
        openedAt: null,
        closedAt: null,
      });

      cycle = await manager.save(OperatingCycle, cycle);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: cycle.id,
        aggregateType: "operating_cycle",
        eventType: "cycle.created.v1",
        actorUserId,
        payload: {
          cycleId: cycle.id,
          schemeId: cycle.schemeId,
          name: cycle.name,
          code: cycle.code,
          status: cycle.status,
          startsOn: cycle.startsOn,
          endsOn: cycle.endsOn,
          targetAmount: cycle.targetAmount,
        },
      });

      return manager.findOneOrFail(OperatingCycle, {
        where: { id: cycle.id, tenantId },
        relations: { scheme: true },
      });
    });
  }

  async findByScheme(
    tenantId: string,
    schemeId: string,
    query: ListOperatingCyclesQueryDto,
  ): Promise<[OperatingCycle[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any[] = [];

    const baseWhere: Record<string, unknown> = {
      tenantId,
      schemeId,
    };

    if (query.status) {
      baseWhere.status = query.status;
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      where.push(
        { ...baseWhere, name: ILike(search) },
        { ...baseWhere, code: ILike(search) },
      );
    } else {
      where.push(baseWhere);
    }

    return this.cyclesRepo.findAndCount({
      where,
      relations: {
        scheme: true,
      },
      order: {
        createdAt: "DESC",
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<OperatingCycle> {
    const cycle = await this.cyclesRepo.findOne({
      where: { id, tenantId },
      relations: { scheme: true },
    });

    if (!cycle) {
      throw new NotFoundException("Cycle not found.");
    }

    return cycle;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateOperatingCycleDto,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.dataSource.transaction(async (manager) => {
      const cycle = await manager.findOne(OperatingCycle, {
        where: { id, tenantId },
        relations: { scheme: true },
      });

      if (!cycle) {
        throw new NotFoundException("Cycle not found.");
      }

      if (
        cycle.status === OperatingCycleStatus.CLOSED ||
        cycle.status === OperatingCycleStatus.CANCELLED
      ) {
        throw new BadRequestException(
          "Closed or cancelled cycles cannot be updated.",
        );
      }

      const nextStartsOn = dto.startsOn ?? cycle.startsOn;
      const nextEndsOn = dto.endsOn ?? cycle.endsOn;
      const nextTargetAmount =
        dto.targetAmount !== undefined
          ? dto.targetAmount.trim() || null
          : cycle.targetAmount;

      this.validateCycleDatesForMode(
        cycle.scheme.cycleMode,
        nextStartsOn,
        nextEndsOn,
      );

      this.validateTargetForMode(
        cycle.scheme.cycleMode,
        nextTargetAmount,
      );

      const before = {
        name: cycle.name,
        code: cycle.code,
        description: cycle.description,
        startsOn: cycle.startsOn,
        endsOn: cycle.endsOn,
        targetAmount: cycle.targetAmount,
        status: cycle.status,
      };

      if (dto.name !== undefined) cycle.name = dto.name.trim();
      if (dto.code !== undefined) {
        cycle.code = slugifyCode(dto.code);
      }
      if (dto.description !== undefined) {
        cycle.description = dto.description?.trim() || null;
      }
      if (dto.startsOn !== undefined) cycle.startsOn = dto.startsOn;
      if (dto.endsOn !== undefined) cycle.endsOn = dto.endsOn;
      if (dto.targetAmount !== undefined) {
        cycle.targetAmount = dto.targetAmount.trim() || null;
      }

      const duplicate = await manager.findOne(OperatingCycle, {
        where: [
          { tenantId, schemeId: cycle.schemeId, name: cycle.name },
          { tenantId, schemeId: cycle.schemeId, code: cycle.code },
        ],
      });

      if (duplicate && duplicate.id !== cycle.id) {
        throw new ConflictException(
          "A cycle with this name or code already exists under this scheme.",
        );
      }

      const saved = await manager.save(OperatingCycle, cycle);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "operating_cycle",
        eventType: "cycle.updated.v1",
        actorUserId,
        payload: {
          cycleId: saved.id,
          schemeId: saved.schemeId,
          before,
          after: {
            name: saved.name,
            code: saved.code,
            description: saved.description,
            startsOn: saved.startsOn,
            endsOn: saved.endsOn,
            targetAmount: saved.targetAmount,
            status: saved.status,
          },
        },
      });

      return saved;
    });
  }

  async open(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.transitionStatus(
      tenantId,
      id,
      OperatingCycleStatus.OPEN,
      "cycle.opened.v1",
      actorUserId,
    );
  }

  async pause(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.transitionStatus(
      tenantId,
      id,
      OperatingCycleStatus.PAUSED,
      "cycle.paused.v1",
      actorUserId,
    );
  }

  async close(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.transitionStatus(
      tenantId,
      id,
      OperatingCycleStatus.CLOSED,
      "cycle.closed.v1",
      actorUserId,
    );
  }

  async cancel(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.transitionStatus(
      tenantId,
      id,
      OperatingCycleStatus.CANCELLED,
      "cycle.cancelled.v1",
      actorUserId,
    );
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    nextStatus: OperatingCycleStatus,
    eventType: string,
    actorUserId?: string,
  ): Promise<OperatingCycle> {
    return this.dataSource.transaction(async (manager) => {
      const cycle = await manager.findOne(OperatingCycle, {
        where: { id, tenantId },
        relations: { scheme: true },
      });

      if (!cycle) {
        throw new NotFoundException("Cycle not found.");
      }

      this.assertValidStatusTransition(cycle.status, nextStatus);

      const previousStatus = cycle.status;
      cycle.status = nextStatus;

      if (nextStatus === OperatingCycleStatus.OPEN && !cycle.openedAt) {
        cycle.openedAt = new Date();
      }

      if (nextStatus === OperatingCycleStatus.CLOSED) {
        cycle.closedAt = new Date();
      }

      const saved = await manager.save(OperatingCycle, cycle);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "operating_cycle",
        eventType,
        actorUserId,
        payload: {
          cycleId: saved.id,
          schemeId: saved.schemeId,
          previousStatus,
          status: saved.status,
          openedAt: saved.openedAt,
          closedAt: saved.closedAt,
        },
      });

      return saved;
    });
  }

  private assertValidStatusTransition(
    current: OperatingCycleStatus,
    next: OperatingCycleStatus,
  ): void {
    const allowed: Record<OperatingCycleStatus, OperatingCycleStatus[]> = {
      [OperatingCycleStatus.DRAFT]: [
        OperatingCycleStatus.OPEN,
        OperatingCycleStatus.CANCELLED,
      ],
      [OperatingCycleStatus.OPEN]: [
        OperatingCycleStatus.PAUSED,
        OperatingCycleStatus.CLOSED,
      ],
      [OperatingCycleStatus.PAUSED]: [
        OperatingCycleStatus.OPEN,
        OperatingCycleStatus.CLOSED,
      ],
      [OperatingCycleStatus.CLOSED]: [],
      [OperatingCycleStatus.CANCELLED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Invalid cycle status transition from ${current} to ${next}.`,
      );
    }
  }

  private validateCycleDatesForMode(
    cycleMode: CycleMode,
    startsOn: string | null,
    endsOn: string | null,
  ): void {
    if (cycleMode === CycleMode.FIXED_PERIOD) {
      if (!startsOn || !endsOn) {
        throw new BadRequestException(
          "Fixed-period cycles require both startsOn and endsOn.",
        );
      }
    }

    if (startsOn && endsOn && startsOn > endsOn) {
      throw new BadRequestException("startsOn cannot be after endsOn.");
    }
  }

  private validateTargetForMode(
    cycleMode: CycleMode,
    targetAmount: string | null,
  ): void {
    if (cycleMode === CycleMode.PROJECT_BASED && !targetAmount) {
      throw new BadRequestException(
        "Project-based cycles require a targetAmount.",
      );
    }

    assertPositiveMoneyString(targetAmount, "targetAmount", { allowEmpty: true });
  }
}