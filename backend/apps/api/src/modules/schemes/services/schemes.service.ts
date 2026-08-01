import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike } from "typeorm";
import { ListSchemesQueryDto } from "../dto/schemes/list-schemes.query.dto";
import { DataSource, Repository } from "typeorm";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { CreateSchemeDto } from "../dto/schemes/create-scheme.dto";
import { UpdateSchemeDto } from "../dto/schemes/update-scheme.dto";
import { SchemeStatus, LoanMode } from "../enums/scheme.enums";
import { SchemesOutboxService } from "./schemes-outbox.service";
import { OperatingCyclesService } from "./operating-cycles.service";
import { ensureDraftLoanPolicyForScheme } from "../../loans/services/loan-policy.service";
import { slugifyCode } from "../../../common/utils/code-generator";

@Injectable()
export class SchemesService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(CooperativeScheme)
    private readonly schemesRepo: Repository<CooperativeScheme>,

    private readonly schemesOutboxService: SchemesOutboxService,
    private readonly operatingCyclesService: OperatingCyclesService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateSchemeDto,
    actorUserId?: string,
  ): Promise<CooperativeScheme> {
    return this.dataSource.transaction(async (manager) => {
      const name = dto.name.trim();
      const code = dto.code?.trim()
      ? slugifyCode(dto.code)
      : slugifyCode(dto.name);

      const existing = await manager.findOne(CooperativeScheme, {
        where: [
          { tenantId, name },
          { tenantId, code },
        ],
      });

      if (existing) {
        throw new ConflictException(
          "A scheme with this name or code already exists in this tenant.",
        );
      }

      let scheme = manager.create(CooperativeScheme, {
        tenantId,
        name,
        code,
        description: dto.description?.trim() || null,
        cycleMode: dto.cycleMode,
        contributionMode: dto.contributionMode,
        loanMode: dto.loanMode,
        payoutMode: dto.payoutMode,
        status: SchemeStatus.DRAFT,
        isActive: true,
        activatedAt: null,
      });

      scheme = await manager.save(CooperativeScheme, scheme);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: scheme.id,
        aggregateType: "cooperative_scheme",
        eventType: "scheme.created.v1",
        actorUserId,
        payload: {
          schemeId: scheme.id,
          name: scheme.name,
          code: scheme.code,
          cycleMode: scheme.cycleMode,
          contributionMode: scheme.contributionMode,
          loanMode: scheme.loanMode,
          payoutMode: scheme.payoutMode,
          status: scheme.status,
        },
      });

      return manager.findOneOrFail(CooperativeScheme, {
        where: { id: scheme.id, tenantId },
      });
    });
  }

  async findAll(
    tenantId: string,
    query: ListSchemesQueryDto,
  ): Promise<[CooperativeScheme[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any[] = [];

    const baseWhere: Record<string, unknown> = {
      tenantId,
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

    return this.schemesRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(tenantId: string, id: string): Promise<CooperativeScheme> {
    const scheme = await this.schemesRepo.findOne({
      where: { id, tenantId },
    });

    if (!scheme) {
      throw new NotFoundException("Scheme not found.");
    }

    return scheme;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSchemeDto,
    actorUserId?: string,
  ): Promise<CooperativeScheme> {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id, tenantId },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      if (scheme.status === SchemeStatus.ARCHIVED) {
        throw new BadRequestException("Archived schemes cannot be updated.");
      }

      const before = {
        name: scheme.name,
        code: scheme.code,
        description: scheme.description,
        cycleMode: scheme.cycleMode,
        contributionMode: scheme.contributionMode,
        loanMode: scheme.loanMode,
        payoutMode: scheme.payoutMode,
        status: scheme.status,
      };

      if (dto.name !== undefined) scheme.name = dto.name.trim();
      if (dto.code !== undefined) {
        scheme.code = slugifyCode(dto.code);
      }
      if (dto.description !== undefined) {
        scheme.description = dto.description?.trim() || null;
      }
      if (dto.cycleMode !== undefined) scheme.cycleMode = dto.cycleMode;
      if (dto.contributionMode !== undefined) {
        scheme.contributionMode = dto.contributionMode;
      }
      if (dto.loanMode !== undefined) scheme.loanMode = dto.loanMode;
      if (dto.payoutMode !== undefined) scheme.payoutMode = dto.payoutMode;

      const duplicate = await manager.findOne(CooperativeScheme, {
        where: [
          { tenantId, name: scheme.name },
          { tenantId, code: scheme.code },
        ],
      });

      if (duplicate && duplicate.id !== scheme.id) {
        throw new ConflictException(
          "A scheme with this name or code already exists in this tenant.",
        );
      }

      const saved = await manager.save(CooperativeScheme, scheme);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "cooperative_scheme",
        eventType: "scheme.updated.v1",
        actorUserId,
        payload: {
          schemeId: saved.id,
          before,
          after: {
            name: saved.name,
            code: saved.code,
            description: saved.description,
            cycleMode: saved.cycleMode,
            contributionMode: saved.contributionMode,
            loanMode: saved.loanMode,
            payoutMode: saved.payoutMode,
            status: saved.status,
          },
        },
      });

      return saved;
    });
  }

  async activate(
  tenantId: string,
  id: string,
  actorUserId?: string,
): Promise<CooperativeScheme> {
  return this.transitionStatus(
    tenantId,
    id,
    SchemeStatus.ACTIVE,
    "scheme.activated.v1",
    actorUserId,
  );
}

  async suspend(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CooperativeScheme> {
    return this.transitionStatus(
      tenantId,
      id,
      SchemeStatus.SUSPENDED,
      "scheme.suspended.v1",
      actorUserId,
    );
  }

  async archive(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CooperativeScheme> {
    return this.transitionStatus(
      tenantId,
      id,
      SchemeStatus.ARCHIVED,
      "scheme.archived.v1",
      actorUserId,
    );
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    nextStatus: SchemeStatus,
    eventType: string,
    actorUserId?: string,
  ): Promise<CooperativeScheme> {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id, tenantId },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      this.assertValidSchemeStatusTransition(scheme.status, nextStatus);

      const previousStatus = scheme.status;
      scheme.status = nextStatus;

      if (nextStatus === SchemeStatus.ACTIVE) {
        scheme.isActive = true;
        scheme.activatedAt = scheme.activatedAt ?? new Date();
      }

      if (
        nextStatus === SchemeStatus.SUSPENDED ||
        nextStatus === SchemeStatus.ARCHIVED
      ) {
        scheme.isActive = false;
      }

      const saved = await manager.save(CooperativeScheme, scheme);

      if (nextStatus === SchemeStatus.ACTIVE) {
        await this.operatingCyclesService.ensureImplicitCycleForProjectScheme(
          manager,
          tenantId,
          saved,
          actorUserId,
        );

        if (saved.loanMode !== LoanMode.DISABLED) {
          await ensureDraftLoanPolicyForScheme(manager, tenantId, saved.id);
        }
      }

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "cooperative_scheme",
        eventType,
        actorUserId,
        payload: {
          schemeId: saved.id,
          previousStatus,
          status: saved.status,
          isActive: saved.isActive,
        },
      });

      return saved;
    });
  }

  private assertValidSchemeStatusTransition(
    current: SchemeStatus,
    next: SchemeStatus,
  ): void {
    const allowed: Record<SchemeStatus, SchemeStatus[]> = {
      [SchemeStatus.DRAFT]: [
        SchemeStatus.ACTIVE,
        SchemeStatus.ARCHIVED,
      ],
      [SchemeStatus.ACTIVE]: [
        SchemeStatus.SUSPENDED,
        SchemeStatus.ARCHIVED,
      ],
      [SchemeStatus.SUSPENDED]: [
        SchemeStatus.ACTIVE,
        SchemeStatus.ARCHIVED,
      ],
      [SchemeStatus.ARCHIVED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Invalid scheme status transition from ${current} to ${next}.`,
      );
    }
  }
}