import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource, ILike, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { Role } from '../entities/role.entity';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from '../dto/update-tenant-user.dto';
import { ListTenantUsersQueryDto } from '../dto/list-tenant-users.query.dto';
import { IdentityOutboxService } from '../services/identity-outbox.service';
import { CreateTempPasswordUserDto } from '../dto/create-temp-password-user.dto';
import { hashPassword } from '../../../common/auth/password';


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
  ): Promise<TenantUser[]> {

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

    return await qb.getMany();
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
   * Updates tenant-specific membership and selected global user fields.
   */
  async updateTenantUser(
    tenantId: string,
    tenantUserId: string,
    dto: UpdateTenantUserDto,
    actorUserId?: string,
  ): Promise<TenantUser> {
    return await this.dataSource.transaction(async (manager) => {
      const tenantUser = await manager.findOne(TenantUser, {
        where: {
          userId: tenantUserId,
          tenantId,
        },
        relations: {
          user: true,
        },
      });

      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

      if (dto.firstName !== undefined) {
        tenantUser.user.firstName = dto.firstName.trim();
      }

      if (dto.lastName !== undefined) {
        tenantUser.user.lastName = dto.lastName.trim();
      }

      if (dto.isActive !== undefined) {
        tenantUser.isActive = dto.isActive;
        tenantUser.status = dto.isActive ? 'active' : 'suspended';
      }

      console.log(`Current User's Firstname ${tenantUser.user.firstName}`);


      await manager.save(User, tenantUser.user);
      await manager.save(TenantUser, tenantUser);

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
          isActive: tenantUser.isActive,
          status: tenantUser.status,
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
   * Soft-deactivates a user membership in the current tenant.
   */
  async deactivateTenantUser(
    tenantId: string,
    tenantUserId: string,
    actorUserId?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const tenantUser = await manager.findOne(TenantUser, {
        where: {
          id: tenantUserId,
          tenantId,
        },
        relations: {
          user: true,
        },
      });

      if (!tenantUser) {
        throw new NotFoundException('Tenant user not found.');
      }

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
}