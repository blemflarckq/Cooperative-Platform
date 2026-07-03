import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { TenantUserRole } from '../entities/tenant-user-role.entity';
import { Role } from '../entities/role.entity';
import { UserInvitation } from '../entities/user-invitation.entity';
import { InviteTenantUserDto } from '../dto/invite-tenant-user.dto';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { IdentityOutboxService } from './identity-outbox.service';
import { hashPassword } from '../../../common/auth/password';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantUserInvitationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly identityOutbox: IdentityOutboxService,

    @InjectRepository(User)
    private readonly users: Repository<User>,

    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,

    @InjectRepository(UserInvitation)
    private readonly invitations: Repository<UserInvitation>,
  ) {}

  async inviteTenantUser(params: {
    tenantId: string;
    actorUserId: string;
    dto: InviteTenantUserDto;
  }) {
    const { tenantId, actorUserId, dto } = params;

    return this.dataSource.transaction(async (manager) => {
      const tenant = await manager.findOne(Tenant, {
        where: { id: tenantId, isActive: true },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found or inactive.');
      }

      const email = dto.email.trim().toLowerCase();

      let user = await manager.findOne(User, {
        where: { email },
      });

      if (!user) {
        user = manager.create(User, {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          mobile: dto.mobile,
          isActive: true,
          passwordHash: null,
          mustChangePassword: false,
        });

        user = await manager.save(User, user);

        await this.identityOutbox.publish({
          manager,
          tenantId,
          aggregateId: user.id,
          aggregateType: 'user',
          eventType: 'identity.user.created.v1',
          actorUserId,
          payload: {
            userId: user.id,
            email: user.email,
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
        status: 'invited',
        isActive: false,
        activatedAt: null,
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

      const rawToken = this.generateInvitationToken();
      const tokenHash = this.hashToken(rawToken);
      const   activationUrl = this.buildInvitationAcceptUrl({
        tenantSlug: tenant.slug,
        token: rawToken,
      });

      const invitation = manager.create(UserInvitation, {
        tenantId,
        tenantUserId: tenantUser.id,
        userId: user.id,
        email,
        tokenHash,
        status: 'pending',
        expiresAt: this.daysFromNow(7),
        invitedByUserId: actorUserId,
      });

      await manager.save(UserInvitation, invitation);

      await this.identityOutbox.publish({
        manager,
        tenantId,
        aggregateId: tenantUser.id,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.invited.v1',
        actorUserId,
        payload: {
          userId: user.id,
          tenantUserId: tenantUser.id,
          invitationId: invitation.id,
          email,
          roleIds: dto.roleIds ?? [],
        },
      });

      /**
       * Notification module/worker should consume this event and send email/SMS.
       * Do not send directly inside this transaction.
       */
      await this.identityOutbox.publish({
        manager,
        tenantId,
        aggregateId: invitation.id,
        aggregateType: 'user_invitation',
        eventType: 'identity.invitation.delivery_requested.v1',
        actorUserId,
        payload: {
          invitationId: invitation.id,
          tenantId,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          email,
            activationUrl,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      });

      return {
        tenantUserId: tenantUser.id,
        invitationId: invitation.id,
        email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
          activationUrl,
      };
    });
  }

  private buildInvitationAcceptUrl(params: {
  tenantSlug: string;
  token: string;
}): string {
    const frontendBaseUrl =
      process.env.FRONTEND_APP_URL ?? 'http://localhost:5173';

    const acceptPath =
      process.env.INVITATION_ACCEPT_PATH ?? 'accept-invitation';

    /**
     * Remove trailing slash from base URL.
     */
    const baseUrl = frontendBaseUrl.replace(/\/$/, '');

    /**
     * Remove leading/trailing slashes from path.
     */
    const normalizedPath = acceptPath.replace(/^\/+|\/+$/g, '');

    /**
     * Final format:
     * http://localhost:5173/quasar-coop/accept-invitation?token=abc
     */
    const url = new URL(
      `${baseUrl}/${params.tenantSlug}/${normalizedPath}`,
    );

    url.searchParams.set('token', params.token);

    return url.toString();
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    return this.dataSource.transaction(async (manager) => {
      const tokenHash = this.hashToken(dto.token);

      if (!tokenHash) {
        throw new UnauthorizedException('Invalid invitation token.');
      }

      const invitation = await manager.findOne(UserInvitation, {
        where: {
          tokenHash,
          status: 'pending',
        },
        relations: {
          user: true,
          tenant: true,
          tenantUser: true,
        },
      });

      if (!invitation) {
        throw new UnauthorizedException('Invalid invitation token.');
      }

      if (invitation.expiresAt.getTime() < Date.now()) {
        invitation.status = 'expired';
        await manager.save(UserInvitation, invitation);

        throw new UnauthorizedException('Invitation has expired.');
      }

      if (!invitation.tenant.isActive) {
        throw new ForbiddenException('Tenant is inactive.');
      }

      invitation.user.passwordHash = await hashPassword(dto.password);
      invitation.user.mustChangePassword = false;
      invitation.user.passwordChangedAt = new Date();
      invitation.user.isActive = true;

      invitation.tenantUser.status = 'active';
      invitation.tenantUser.isActive = true;
      invitation.tenantUser.activatedAt = new Date();

      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();

      await manager.save(User, invitation.user);
      await manager.save(TenantUser, invitation.tenantUser);
      await manager.save(UserInvitation, invitation);

      await this.identityOutbox.publish({
        manager,
        tenantId: invitation.tenantId,
        aggregateId: invitation.tenantUserId,
        aggregateType: 'tenant_user',
        eventType: 'identity.tenant_user.activated.v1',
        actorUserId: invitation.userId,
        payload: {
          userId: invitation.userId,
          tenantUserId: invitation.tenantUserId,
          invitationId: invitation.id,
        },
      });

      return {
        success: true,
        tenantId: invitation.tenantId,
        tenantSlug: invitation.tenant.slug,
      };
    });
  }

  async revokeInvitation(params: {
    tenantId: string;
    invitationId: string;
    actorUserId: string;
  }) {
    const { tenantId, invitationId, actorUserId } = params;

    return this.dataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(UserInvitation, {
        where: {
          id: invitationId,
          tenantId,
          status: 'pending',
        },
      });

      if (!invitation) {
        throw new NotFoundException('Pending invitation not found.');
      }

      invitation.status = 'revoked';
      invitation.revokedAt = new Date();

      await manager.save(UserInvitation, invitation);

      await this.identityOutbox.publish({
        manager,
        tenantId,
        aggregateId: invitation.id,
        aggregateType: 'user_invitation',
        eventType: 'identity.invitation.revoked.v1',
        actorUserId,
        payload: {
          invitationId: invitation.id,
          tenantUserId: invitation.tenantUserId,
          userId: invitation.userId,
        },
      });

      return { success: true };
    });
  }

  private generateInvitationToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}