import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, Brackets  } from "typeorm";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { OperatingCycle } from "../entities/operating-cycle.entity";
import { CycleParticipant } from "../entities/cycle-participant.entity";
import { EnrollCycleParticipantDto } from "../dto/cycle-participants/enroll-cycle-participant.dto";
import { UpdateCycleParticipantDto } from "../dto/cycle-participants/update-cycle-participant.dto";
import { BulkEnrollCycleParticipantsDto } from "../dto/cycle-participants/bulk-enroll-cycle-participants.dto";
import { ListCycleParticipantsQueryDto } from "../dto/cycle-participants/list-cycle-participants.query.dto";

import {
  CycleParticipantStatus,
  OperatingCycleStatus,
} from "../enums/scheme.enums";
import { SchemesOutboxService } from "./schemes-outbox.service";

@Injectable()
export class CycleParticipantsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(CycleParticipant)
    private readonly participantsRepo: Repository<CycleParticipant>,

    private readonly schemesOutboxService: SchemesOutboxService,
  ) {}

  async enroll(
    tenantId: string,
    cycleId: string,
    dto: EnrollCycleParticipantDto,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.dataSource.transaction(async (manager) => {
      const cycle = await manager.findOne(OperatingCycle, {
        where: { id: cycleId, tenantId },
      });

      if (!cycle) {
        throw new NotFoundException("Cycle not found.");
      }

      if (
        cycle.status !== OperatingCycleStatus.DRAFT &&
        cycle.status !== OperatingCycleStatus.OPEN
      ) {
        throw new BadRequestException(
          "Participants can only be enrolled into draft or open cycles.",
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

      const existing = await manager.findOne(CycleParticipant, {
        where: {
          tenantId,
          cycleId,
          tenantUserId: tenantUser.id,
        },
      });

      if (existing) {
        throw new ConflictException(
          "This tenant user is already enrolled in this cycle.",
        );
      }

      let participant = manager.create(CycleParticipant, {
        tenantId,
        cycleId,
        tenantUserId: tenantUser.id,
        status: CycleParticipantStatus.ACTIVE,
        joinedAt: new Date(),
        exitedAt: null,
        notes: dto.notes?.trim() || null,
      });

      participant = await manager.save(CycleParticipant, participant);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: participant.id,
        aggregateType: "cycle_participant",
        eventType: "cycle_participant.enrolled.v1",
        actorUserId,
        payload: {
          participantId: participant.id,
          cycleId: participant.cycleId,
          tenantUserId: participant.tenantUserId,
          status: participant.status,
          joinedAt: participant.joinedAt,
        },
      });

      return manager.findOneOrFail(CycleParticipant, {
        where: { id: participant.id, tenantId },
        relations: {
          cycle: true,
          tenantUser: {
            user: true,
          },
        },
      });
    });
  }

  async bulkEnroll(
    tenantId: string,
    cycleId: string,
    dto: BulkEnrollCycleParticipantsDto,
    actorUserId?: string,
  ): Promise<{
    enrolled: CycleParticipant[];
    skipped: {
      tenantUserId: string;
      reason: string;
    }[];
  }> {
    return this.dataSource.transaction(async (manager) => {
      const uniqueTenantUserIds = [...new Set(dto.tenantUserIds)];

      const cycle = await manager.findOne(OperatingCycle, {
        where: { id: cycleId, tenantId },
      });

      if (!cycle) {
        throw new NotFoundException("Cycle not found.");
      }

      if (
        cycle.status !== OperatingCycleStatus.DRAFT &&
        cycle.status !== OperatingCycleStatus.OPEN
      ) {
        throw new BadRequestException(
          "Participants can only be enrolled into draft or open cycles.",
        );
      }

      const tenantUsers = await manager.find(TenantUser, {
        where: uniqueTenantUserIds.map((id) => ({
          id,
          tenantId,
          isActive: true,
          status: "active",
        })),
      });

      const validTenantUserIds = new Set(tenantUsers.map((user) => user.id));

      const existingParticipants = await manager.find(CycleParticipant, {
        where: uniqueTenantUserIds.map((tenantUserId) => ({
          tenantId,
          cycleId,
          tenantUserId,
        })),
      });

      const alreadyEnrolledIds = new Set(
        existingParticipants.map((participant) => participant.tenantUserId),
      );

      const skipped: { tenantUserId: string; reason: string }[] = [];

      const participantsToCreate = uniqueTenantUserIds
        .filter((tenantUserId) => {
          if (!validTenantUserIds.has(tenantUserId)) {
            skipped.push({
              tenantUserId,
              reason:
                "Tenant user is invalid, inactive, or does not belong to this tenant.",
            });
            return false;
          }

          if (alreadyEnrolledIds.has(tenantUserId)) {
            skipped.push({
              tenantUserId,
              reason: "Tenant user is already enrolled in this cycle.",
            });
            return false;
          }

          return true;
        })
        .map((tenantUserId) =>
          manager.create(CycleParticipant, {
            tenantId,
            cycleId,
            tenantUserId,
            status: CycleParticipantStatus.ACTIVE,
            joinedAt: new Date(),
            exitedAt: null,
            notes: dto.notes?.trim() || null,
          }),
        );

      const enrolled = participantsToCreate.length
        ? await manager.save(CycleParticipant, participantsToCreate)
        : [];

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: cycleId,
        aggregateType: "cycle_participant",
        eventType: "cycle_participant.bulk_enrolled.v1",
        actorUserId,
        payload: {
          cycleId,
          requestedCount: dto.tenantUserIds.length,
          uniqueRequestedCount: uniqueTenantUserIds.length,
          enrolledCount: enrolled.length,
          skippedCount: skipped.length,
          enrolledParticipantIds: enrolled.map((participant) => participant.id),
          enrolledTenantUserIds: enrolled.map(
            (participant) => participant.tenantUserId,
          ),
          skipped,
        },
      });

      return {
        enrolled,
        skipped,
      };
    });
  }

  async findByCycle(
    tenantId: string,
    cycleId: string,
    query: ListCycleParticipantsQueryDto,
  ): Promise<[CycleParticipant[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.participantsRepo
      .createQueryBuilder("participant")
      .leftJoinAndSelect("participant.tenantUser", "tenantUser")
      .leftJoinAndSelect("tenantUser.user", "user")
      .where("participant.tenantId = :tenantId", { tenantId })
      .andWhere("participant.cycleId = :cycleId", { cycleId });

    if (query.status) {
      qb.andWhere("participant.status = :status", {
        status: query.status,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where("user.email ILIKE :search", { search })
            .orWhere("user.firstName ILIKE :search", { search })
            .orWhere("user.lastName ILIKE :search", { search });
        }),
      );
    }

    qb.orderBy("participant.joinedAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<CycleParticipant> {
    const participant = await this.participantsRepo.findOne({
      where: { id, tenantId },
      relations: {
        cycle: true,
        tenantUser: {
          user: true,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException("Cycle participant not found.");
    }

    return participant;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCycleParticipantDto,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.dataSource.transaction(async (manager) => {
      const participant = await manager.findOne(CycleParticipant, {
        where: { id, tenantId },
      });

      if (!participant) {
        throw new NotFoundException("Cycle participant not found.");
      }

      if (
        participant.status === CycleParticipantStatus.REMOVED ||
        participant.status === CycleParticipantStatus.EXITED
      ) {
        throw new BadRequestException(
          "Removed or exited participants cannot be updated.",
        );
      }

      const before = {
        notes: participant.notes,
        status: participant.status,
      };

      if (dto.notes !== undefined) {
        participant.notes = dto.notes?.trim() || null;
      }

      const saved = await manager.save(CycleParticipant, participant);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "cycle_participant",
        eventType: "cycle_participant.updated.v1",
        actorUserId,
        payload: {
          participantId: saved.id,
          cycleId: saved.cycleId,
          tenantUserId: saved.tenantUserId,
          before,
          after: {
            notes: saved.notes,
            status: saved.status,
          },
        },
      });

      return saved;
    });
  }

  async suspend(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.transitionStatus(
      tenantId,
      id,
      CycleParticipantStatus.SUSPENDED,
      "cycle_participant.suspended.v1",
      actorUserId,
    );
  }

  async reactivate(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.transitionStatus(
      tenantId,
      id,
      CycleParticipantStatus.ACTIVE,
      "cycle_participant.reactivated.v1",
      actorUserId,
    );
  }

  async exit(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.transitionStatus(
      tenantId,
      id,
      CycleParticipantStatus.EXITED,
      "cycle_participant.exited.v1",
      actorUserId,
    );
  }

  async remove(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.transitionStatus(
      tenantId,
      id,
      CycleParticipantStatus.REMOVED,
      "cycle_participant.removed.v1",
      actorUserId,
    );
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    nextStatus: CycleParticipantStatus,
    eventType: string,
    actorUserId?: string,
  ): Promise<CycleParticipant> {
    return this.dataSource.transaction(async (manager) => {
      const participant = await manager.findOne(CycleParticipant, {
        where: { id, tenantId },
        relations: {
          cycle: true,
        },
      });

      if (!participant) {
        throw new NotFoundException("Cycle participant not found.");
      }

      this.assertValidStatusTransition(participant.status, nextStatus);

      const previousStatus = participant.status;
      participant.status = nextStatus;

      if (
        nextStatus === CycleParticipantStatus.EXITED ||
        nextStatus === CycleParticipantStatus.REMOVED
      ) {
        participant.exitedAt = new Date();
      }

      const saved = await manager.save(CycleParticipant, participant);

      await this.schemesOutboxService.publish({
        manager,
        tenantId,
        aggregateId: saved.id,
        aggregateType: "cycle_participant",
        eventType,
        actorUserId,
        payload: {
          participantId: saved.id,
          cycleId: saved.cycleId,
          tenantUserId: saved.tenantUserId,
          previousStatus,
          status: saved.status,
          exitedAt: saved.exitedAt,
        },
      });

      return saved;
    });
  }

  private assertValidStatusTransition(
    current: CycleParticipantStatus,
    next: CycleParticipantStatus,
  ): void {
    const allowed: Record<
      CycleParticipantStatus,
      CycleParticipantStatus[]
    > = {
      [CycleParticipantStatus.ACTIVE]: [
        CycleParticipantStatus.SUSPENDED,
        CycleParticipantStatus.EXITED,
        CycleParticipantStatus.REMOVED,
      ],
      [CycleParticipantStatus.SUSPENDED]: [
        CycleParticipantStatus.ACTIVE,
        CycleParticipantStatus.EXITED,
        CycleParticipantStatus.REMOVED,
      ],
      [CycleParticipantStatus.EXITED]: [],
      [CycleParticipantStatus.REMOVED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Invalid participant status transition from ${current} to ${next}.`,
      );
    }
  }
}