import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource, ILike, Not, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { Role } from '../entities/role.entity';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from '../dto/update-tenant-user.dto';
import { ListTenantUsersQueryDto } from '../dto/list-tenant-users.query.dto';
import { CycleParticipant } from '../../schemes/entities/cycle-participant.entity';
import { CycleParticipantStatus, OperatingCycleStatus, SchemeStatus } from '../../schemes/enums/scheme.enums';
import { IdentityOutboxService } from '../services/identity-outbox.service';
import { CreateTempPasswordUserDto } from '../dto/create-temp-password-user.dto';
import { hashPassword } from '../../../common/auth/password';
import {
  assertMayGrantInitialRoles,
  countOtherActiveAdmins,
  loadActor,
  loadRoleCodes,
  lockCooperative,
  throwViolation,
} from './tenant-user-governance';
import { checkDeactivation, checkReactivation } from './tenant-user-rules';


@Injectable()
export class TenantUsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly identityOutboxService: IdentityOutboxService,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(TenantUser)
    private readonly tenantUsersRepository: Repository<TenantUser>,

    @InjectRepository(TenantUserRole)
    private readonly tenantUserRolesRepository: Repository<TenantUserRole>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  /**
   * Creates a tenant membership for a user.
   * If the global user does not exist yet, it is created first.
   */
  async createTenantUser(
    tenantId: string,
    dto: CreateTenantUserDto,
    actorUserId?: string,
  ): Promise<TenantUser> {
    return await this.dataSource.transaction(async (manager) => {
      const normalizedEmail = dto.email.trim().toLowerCase();

      let user = await manager.findOne(User, {
        where: { email: normalizedEmail },
      });

      const isNewGlobalUser = !user;

      if (!user) {
        user = manager.create(User, {
          email: normalizedEmail,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          isActive: true,
        });

        user = await manager.save(User, user);

        await this.identityOutboxService.publish({
          manager,
          tenantId,
          aggregateId: user.id,
          aggregateType: 'user',
          eventType: 'identity.user.created.v1',
          actorUserId,
          payload: {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      const existingTenantUser = await manager.findOne(TenantUser, {
        where: {
          tenantId,
          userId: user.id,
        },
      });

      if (existingTenantUser) {
        throw new ConflictException('User already belongs to this tenant.');
      }

      let tenantUser = manager.create(TenantUser, {
        tenantId,
        userId: user.id,
        isActive: true,
        status: isNewGlobalUser ? 'invited' : 'active',
      });

      tenantUser = await manager.save(TenantUser, tenantUser);

      if (dto.roleIds?.length) {
        const roles = await manager.find(Role, {
          where: dto.roleIds.map((id) => ({
            id,
            tenantId,
            isActive: true,
          })),
        });

        if (roles.length !== dto.roleIds.length) {
          throw new BadRequestException(
            'One or more roles are invalid or belong to another tenant.',
          );
        }

        await assertMayGrantInitialRoles(manager, tenantId, actorUserId, roles);

        const joinRows = roles.map((role) =>
          manager.create(TenantUserRole, {
            tenantUserId: tenantUser.id,
            roleId: role.id,
          }),
        );

        await manager.save(TenantUserRole, joinRows);
      }

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUser.id,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.created.v1',
        actorUserId,
        payload: {
          tenantUserId: tenantUser.id,
          userId: user.id,
          email: user.email,
          status: tenantUser.status,
          roleIds: dto.roleIds ?? [],
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUser.id, tenantId },
        relations: {
          user: true,
          roles: { role: true },
        },
      });
    });
  }

async createWithTemporaryPassword(params: {
  tenantId: string;
  actorUserId: string;
  dto: CreateTempPasswordUserDto;
}) {
  const { tenantId, actorUserId, dto } = params;

  return this.dataSource.transaction(async (manager) => {
    const email = dto.email.trim().toLowerCase();

    let user = await manager.findOne(User, {
      where: { email },
    });

    if (!user) {
      user = manager.create(User, {
        email,
        mobile: dto.mobile,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        isActive: true,
      });
    }

    user.passwordHash = await hashPassword(dto.temporaryPassword);
    user.mustChangePassword = true;
    user.passwordChangedAt = null;

    user = await manager.save(User, user);

    const existingTenantUser = await manager.findOne(TenantUser, {
      where: {
        tenantId,
        userId: user.id,
      },
    });

    if (existingTenantUser) {
      throw new ConflictException('User already belongs to this tenant.');
    }

    let tenantUser = manager.create(TenantUser, {
      tenantId,
      userId: user.id,
      status: 'active',
      isActive: true,
      activatedAt: new Date(),
    });

    tenantUser = await manager.save(TenantUser, tenantUser);

    if (dto.roleIds?.length) {
      const roles = await manager.find(Role, {
        where: {
          id: In(dto.roleIds),
          tenantId,
          isActive: true,
        },
      });

      if (roles.length !== dto.roleIds.length) {
        throw new BadRequestException(
          'One or more roles are invalid for this tenant.',
        );
      }

      await assertMayGrantInitialRoles(manager, tenantId, actorUserId, roles);

      const roleRows = roles.map((role) =>
        manager.create(TenantUserRole, {
          tenantUserId: tenantUser.id,
          roleId: role.id,
        }),
      );

      await manager.save(TenantUserRole, roleRows);
    }

    await this.identityOutboxService.publish({
      manager,
      tenantId,
      aggregateId: tenantUser.id,
      aggregateType: 'tenant_user',
      eventType: 'identity.tenant_user.temp_password_created.v1',
      actorUserId,
      payload: {
        userId: user.id,
        tenantUserId: tenantUser.id,
        email,
        mustChangePassword: true,
        roleIds: dto.roleIds ?? [],
      },
    });

    return {
      tenantUserId: tenantUser.id,
      userId: user.id,
      email: user.email,
      mustChangePassword: true,
    };
  });
}

  /**
   * Lists users inside the current tenant only.
   */
  async listTenantUsers(
    tenantId: string,
    query: ListTenantUsersQueryDto,
  ): Promise<Array<{ tenantUser: TenantUser; schemeNames: string[] }>> {

    const qb = this.tenantUsersRepository
      .createQueryBuilder('tenantUser')
      .leftJoinAndSelect('tenantUser.user', 'user')
      .leftJoinAndSelect('tenantUser.roles', 'tenantUserRole')
      .leftJoinAndSelect('tenantUserRole.role', 'role')
      .where('tenantUser.tenantId = :tenantId', { tenantId })
      .orderBy('tenantUser.createdAt', 'DESC');
    
    if (query.isActive !== undefined) {
      qb.andWhere('tenantUser.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('user.email ILIKE :q', { q })
            .orWhere('user.firstName ILIKE :q', { q })
            .orWhere('user.lastName ILIKE :q', { q });
        }),
      );
    }

    const tenantUsers = await qb.getMany();

    if (tenantUsers.length === 0) {
      return [];
    }

    const schemeNamesByTenantUserId = await this.activeSchemeNamesByMember(tenantId);

    return tenantUsers.map((tenantUser) => ({
      tenantUser,
      schemeNames: schemeNamesByTenantUserId.get(tenantUser.id) ?? [],
    }));
  }

  /**
   * Active scheme participation, resolved the same way the member
   * dashboard resolves a person's own active schemes. One batch query for
   * every member (or just one, when `tenantUserId` is given) rather than
   * one per row. The single definition of "which schemes is this member
   * in" for both the list and the detail view.
   */
  private async activeSchemeNamesByMember(
    tenantId: string,
    tenantUserId?: string,
  ): Promise<Map<string, string[]>> {
    const qb = this.tenantUsersRepository.manager
      .createQueryBuilder(CycleParticipant, 'participant')
      .innerJoin('participant.cycle', 'cycle')
      .innerJoin('cycle.scheme', 'scheme')
      .where('participant.tenantId = :tenantId', { tenantId })
      .andWhere('participant.status = :participantStatus', {
        participantStatus: CycleParticipantStatus.ACTIVE,
      })
      .andWhere('cycle.status = :cycleStatus', { cycleStatus: OperatingCycleStatus.OPEN })
      .andWhere('scheme.status = :schemeStatus', { schemeStatus: SchemeStatus.ACTIVE });

    if (tenantUserId) {
      qb.andWhere('participant.tenantUserId = :tenantUserId', { tenantUserId });
    }

    const participations = await qb
      .select(['participant.tenantUserId AS "tenantUserId"', 'scheme.name AS "schemeName"'])
      .getRawMany<{ tenantUserId: string; schemeName: string }>();

    const byMember = new Map<string, string[]>();
    for (const row of participations) {
      const existing = byMember.get(row.tenantUserId) ?? [];
      existing.push(row.schemeName);
      byMember.set(row.tenantUserId, existing);
    }
    return byMember;
  }

  /** The names of the schemes one member is currently active in. */
  async getActiveSchemeNames(tenantId: string, tenantUserId: string): Promise<string[]> {
    const byMember = await this.activeSchemeNamesByMember(tenantId, tenantUserId);
    return byMember.get(tenantUserId) ?? [];
  }

  async getTenantUser(tenantId: string, tenantUserId: string): Promise<TenantUser> {
    const entity = await this.tenantUsersRepository.findOne({
      where: {
        id: tenantUserId,
        tenantId,
      },
      relations: {
        user: true,
        roles: { role: true },
      },
    });

    if (!entity) {
      throw new NotFoundException('Tenant user not found.');
    }

    return entity;
  }

  /**
   * Resolves the caller's OWN tenant-user record from their JWT's raw
   * userId — needed anywhere a self-service action (like allocating your
   * own recorded payment) operates on tenantUserId, not userId, and the
   * caller might not hold the broader user:read permission needed to look
   * anyone up via the general list/get endpoints.
   */
  async getForCurrentUser(tenantId: string, userId: string): Promise<TenantUser> {
    const entity = await this.tenantUsersRepository.findOne({
      where: {
        userId,
        tenantId,
        isActive: true,
      },
      // Roles included: screens use them to say up front what the viewer
      // may and may not do, rather than failing after the tap.
      relations: {
        user: true,
        roles: { role: true },
      },
    });

    if (!entity) {
      throw new NotFoundException('You are not an active member of this tenant.');
    }

    return entity;
  }

  /**
   * True when this person is an active member of any OTHER cooperative.
   * Their name belongs to their account, not to this cooperative, so
   * while they are in more than one, only they may change it.
   */
  async isIdentityShared(tenantId: string, userId: string): Promise<boolean> {
    const elsewhere = await this.tenantUsersRepository.count({
      where: { userId, isActive: true, tenantId: Not(tenantId) },
    });
    return elsewhere > 0;
  }

  /**
   * Corrects a member's name. Names only: phone number is how the person
   * signs in (changing it needs their own verification, which comes with
   * phone sign-in), and deactivating has its own endpoint with its own
   * safeguards — this one must not be a way around them.
   */
  async updateTenantUser(
    tenantId: string,
    tenantUserId: string,
    dto: UpdateTenantUserDto,
    actorUserId?: string,
  ): Promise<TenantUser> {
    return await this.dataSource.transaction(async (manager) => {
      const tenantUser = await manager.findOne(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: { user: true },
      });

      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

      if (await this.isIdentityShared(tenantId, tenantUser.userId)) {
        throw new ForbiddenException(
          'This person belongs to other cooperatives too, so only they can change their name.',
        );
      }

      if (dto.firstName !== undefined) {
        tenantUser.user.firstName = dto.firstName.trim();
      }

      if (dto.lastName !== undefined) {
        tenantUser.user.lastName = dto.lastName.trim();
      }

      await manager.save(User, tenantUser.user);

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUser.id,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.updated.v1',
        actorUserId,
        payload: {
          tenantUserId: tenantUser.id,
          userId: tenantUser.user.id,
          firstName: tenantUser.user.firstName,
          lastName: tenantUser.user.lastName,
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUser.id, tenantId },
        relations: {
          user: true,
          roles: { role: true },
        },
      });
    });
  }

  /**
   * Takes someone out of the cooperative's day-to-day: they can no longer
   * sign in to it, and their open session ends when its access token next
   * refreshes (within about 15 minutes). Nothing is deleted — their
   * savings, loans and history stay exactly as they were, and they can be
   * reactivated.
   *
   * Refused for yourself, for an administrator unless you are one, and
   * for the last active administrator.
   */
  async deactivateTenantUser(
    tenantId: string,
    tenantUserId: string,
    actorUserId?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await lockCooperative(manager, tenantId);

      const tenantUser = await manager.findOne(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: { user: true },
      });

      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

      const actor = await loadActor(manager, tenantId, actorUserId);

      const violation = checkDeactivation({
        actorTenantUserId: actor.tenantUserId,
        targetTenantUserId: tenantUser.id,
        actorRoleCodes: actor.roleCodes,
        targetRoleCodes: await loadRoleCodes(manager, tenantUser.id),
        targetIsActive: tenantUser.isActive !== false,
        targetStatus: tenantUser.status,
        otherActiveAdmins: await countOtherActiveAdmins(manager, tenantId, tenantUser.id),
      });
      if (violation) throwViolation(violation);

      tenantUser.isActive = false;
      tenantUser.status = 'suspended';

      await manager.save(TenantUser, tenantUser);

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUser.id,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.deactivated.v1',
        actorUserId,
        payload: {
          tenantUserId: tenantUser.id,
          userId: tenantUser.user.id,
        },
      });
    });
  }

  /**
   * Undoes a deactivation. Roles were never removed, so the person comes
   * back exactly as they were.
   */
  async reactivateTenantUser(
    tenantId: string,
    tenantUserId: string,
    actorUserId?: string,
  ): Promise<TenantUser> {
    return await this.dataSource.transaction(async (manager) => {
      await lockCooperative(manager, tenantId);

      const tenantUser = await manager.findOne(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: { user: true },
      });

      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

      await loadActor(manager, tenantId, actorUserId);

      const violation = checkReactivation({ isActive: tenantUser.isActive !== false, status: tenantUser.status });
      if (violation) throwViolation(violation);

      tenantUser.isActive = true;
      tenantUser.status = 'active';

      await manager.save(TenantUser, tenantUser);

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUser.id,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.reactivated.v1',
        actorUserId,
        payload: {
          tenantUserId: tenantUser.id,
          userId: tenantUser.user.id,
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUser.id, tenantId },
        relations: { user: true, roles: { role: true } },
      });
    });
  }
}
