import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { Role } from '../entities/role.entity';
import { IdentityOutboxService } from './identity-outbox.service';

@Injectable()
export class TenantUserRolesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly identityOutboxService: IdentityOutboxService,

    @InjectRepository(TenantUser)
    private readonly tenantUsersRepository: Repository<TenantUser>,

    @InjectRepository(TenantUserRole)
    private readonly tenantUserRolesRepository: Repository<TenantUserRole>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async assignRoles(
    tenantId: string,
    tenantUserId: string,
    roleIds: string[],
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

      const roles = await manager.find(Role, {
        where: {
          id: In(roleIds),
          tenantId,
          isActive: true,
        },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException(
          'One or more roles are invalid or belong to another tenant.',
        );
      }

      const existingRows = await manager.find(TenantUserRole, {
        where: {
          tenantUserId,
          roleId: In(roleIds),
        },
      });

      const existingRoleIds = new Set(existingRows.map((row) => row.roleId));

      const toCreate = roles
        .filter((role) => !existingRoleIds.has(role.id))
        .map((role) =>
          manager.create(TenantUserRole, {
            tenantUserId,
            roleId: role.id,
          }),
        );

      if (toCreate.length > 0) {
        await manager.save(TenantUserRole, toCreate);
      }

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUserId,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.roles.assigned.v1',
        actorUserId,
        payload: {
          tenantUserId,
          userId: tenantUser.user.id,
          roleIds,
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: {
          user: true,
          roles: { role: true },
        },
      });
    });
  }

  async revokeRoles(
    tenantId: string,
    tenantUserId: string,
    roleIds: string[],
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

      await manager.delete(TenantUserRole, {
        tenantUserId,
        roleId: In(roleIds),
      });

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUserId,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.roles.revoked.v1',
        actorUserId,
        payload: {
          tenantUserId,
          userId: tenantUser.user.id,
          roleIds,
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: {
          user: true,
          roles: { role: true },
        },
      });
    });
  }

  async replaceRoles(
    tenantId: string,
    tenantUserId: string,
    roleIds: string[],
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

      const roles = await manager.find(Role, {
        where: {
          id: In(roleIds),
          tenantId,
          isActive: true,
        },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException(
          'One or more roles are invalid or belong to another tenant.',
        );
      }

      await manager.delete(TenantUserRole, { tenantUserId });

      const newRows = roles.map((role) =>
        manager.create(TenantUserRole, {
          tenantUserId,
          roleId: role.id,
        }),
      );

      if (newRows.length > 0) {
        await manager.save(TenantUserRole, newRows);
      }

      await this.identityOutboxService.publish({
        manager,
        tenantId,
        aggregateId: tenantUserId,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.roles.replaced.v1',
        actorUserId,
        payload: {
          tenantUserId,
          userId: tenantUser.user.id,
          roleIds,
        },
      });

      return await manager.findOneOrFail(TenantUser, {
        where: { id: tenantUserId, tenantId },
        relations: {
          user: true,
          roles: { role: true },
        },
      });
    });
  }
}