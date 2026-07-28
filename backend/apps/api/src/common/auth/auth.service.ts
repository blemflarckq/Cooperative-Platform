/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { StringValue } from "ms";
import { JwtService, JwtSignOptions  } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { verifyPassword } from "./password";
import { User } from "../../modules/identity/entities/user.entity";
import { Tenant } from "../../modules/identity/entities/tenant.entity";
import { TenantUser } from "../../modules/identity/entities/tenant-user.entity";
import { TenantUserRole } from "../../modules/identity/entities/tenant-user-role.entity";
import { hashPassword } from '../../common/auth/password';
import { getRequiredEnv } from "../../config/env";

/**
 * AuthService is tenant-aware:
 * - user authenticates with email/password + tenantSlug
 * - we validate membership in that tenant
 * - we expand roles -> permissions for that tenant
 * - we issue JWT bound to tenantId
 */

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    tenantName: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;

  };
}

type TokenType = "access" | "refresh";

interface AuthJwtPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  tokenType: TokenType;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,

    @InjectRepository(User)
    private readonly users: Repository<User>,

    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,

    @InjectRepository(TenantUser)
    private readonly tenantUsers: Repository<TenantUser>,

    @InjectRepository(TenantUserRole)
    private readonly tenantUserRoles: Repository<TenantUserRole>,
  ) {}

  async login(params: {
    email: string;
    password: string;
    tenantSlug: string;
  }): Promise<LoginResponse> {
    const email = params.email.trim().toLowerCase();
    const tenantSlug = params.tenantSlug.trim().toLowerCase();

    const tenant = await this.tenants.createQueryBuilder("tenant")
      .where("tenant.slug = :slug", {slug: tenantSlug})
      .andWhere("tenant.isActive= :active", {active: true})
      .getOne();

    if (!tenant) {
      throw new UnauthorizedException("Invalid tenant or tenant inactive");
    }

    const user = await this.users.createQueryBuilder("user")
      .where("user.email = :email", { email })
      .andWhere("user.isActive= :active", { active: true })
      .getOne();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordOk = await verifyPassword(params.password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildLoginResponse(user, tenant);
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    let payload: AuthJwtPayload;

    try {
      payload = await this.jwt.verifyAsync<AuthJwtPayload>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.users.findOne({
      where: {
        id: payload.sub,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User account is inactive or no longer exists");
    }

    const tenant = await this.tenants.findOne({
      where: {
        id: payload.tenantId,
        isActive: true,
      },
    });

    if (!tenant) {
      throw new UnauthorizedException("Tenant is inactive or no longer exists");
    }

    return this.buildLoginResponse(user, tenant);
  }

  private async buildLoginResponse(
    user: User,
    tenant: Tenant,
  ): Promise<LoginResponse> {
    const tenantUser = await this.tenantUsers.findOne({
      where: {
        tenantId: tenant.id,
        userId: user.id,
        isActive: true,
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException("User is not a member of this tenant");
    }

    const { roles, permissions } = await this.getTenantAccessClaims(tenantUser.id);

    const { accessToken, refreshToken } = await this.issueTokens({
      sub: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      roles,
      permissions,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: tenant.id,
        tenantName: tenant.name ?? tenant.slug,
        roles,
        permissions,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private async getTenantAccessClaims(
    tenantUserId: string,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const assignments = await this.tenantUserRoles.find({
      where: { tenantUserId },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    const roles = assignments.map((assignment) => assignment.role.name);

    const permissions = new Set<string>();

    for (const assignment of assignments) {
      const rolePermissions = assignment.role.rolePermissions ?? [];

      for (const rolePermission of rolePermissions) {
        if (rolePermission.permission?.code) {
          permissions.add(rolePermission.permission.code);
        }
      }
    }

    return {
      roles,
      permissions: [...permissions],
    };
  }

  private async issueTokens(params: {
    sub: string;
    tenantId: string;
    tenantSlug: string;
    roles: string[];
    permissions: string[];
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AuthJwtPayload = {
      sub: params.sub,
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      roles: params.roles,
      permissions: params.permissions,
      tokenType: "access",
    };

    const refreshPayload: AuthJwtPayload = {
      sub: params.sub,
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      roles: params.roles,
      permissions: params.permissions,
      tokenType: "refresh",
    };

    const accessOptions: JwtSignOptions = {
      expiresIn: "15m",
    };

    const refreshOptions: JwtSignOptions = {
      secret: this.getRefreshSecret(),
      expiresIn: "30d",
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, accessOptions),
      this.jwt.signAsync(refreshPayload, refreshOptions),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
  private getRefreshSecret(): string {
    return getRequiredEnv("JWT_REFRESH_SECRET");
  }

  async me(userId: string, tenantId: string) {
    const tenantUser = await this.tenantUsers.findOne({
      where: {
        userId,
        tenantId,
        isActive: true,
      },
      relations: {
        user: true,
        tenant: true,
        roles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException('User does not belong to the current tenant.');
    }

    const roles = tenantUser.roles.map((row) => ({
      id: row.role.id,
      key: row.role.code,
      name: row.role.name,
    }));

    const permissions = [
      ...new Set(
        tenantUser.roles.flatMap((row) =>
          row.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    return {
      user: {
        id: tenantUser.user.id,
        email: tenantUser.user.email,
        firstName: tenantUser.user.firstName,
        lastName: tenantUser.user.lastName,
      },
      tenant: {
        id: tenantUser.tenant.id,
        name: tenantUser.tenant.name,
        slug: tenantUser.tenant.slug,
      },
      tenantUser: {
        id: tenantUser.id,
        status: tenantUser.status,
        isActive: tenantUser.isActive,
      },
      roles,
      permissions,
    };
  }

  async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const user = await this.users.findOne({
      where: { id: params.userId, isActive: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid user.');
    }

    const ok = await verifyPassword(params.currentPassword, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedException('Invalid current password.');
    }

    user.passwordHash = await hashPassword(params.newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();

    await this.users.save(user);

    return { success: true };
  }

}