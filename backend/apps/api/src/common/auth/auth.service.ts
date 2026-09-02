/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { verifyPassword } from "./password";
import { User } from "../../modules/identity/entities/user.entity";
import { Tenant } from "../../modules/identity/entities/tenant.entity";
import { TenantUser } from "../../modules/identity/entities/tenant-user.entity";
import { TenantUserRole } from "../../modules/identity/entities/tenant-user-role.entity";
import { hashPassword } from "../../common/auth/password";
import { getRequiredEnv } from "../../config/env";
import type { AuthJwtPayload } from "./jwt.types";

/**
 * AuthService — tenant resolution now happens automatically after
 * identity is confirmed, instead of requiring the caller to already know
 * a tenant slug. Someone can belong to zero, one, or several tenants;
 * this handles all three without ever asking for a slug.
 *
 * PINNED: identity verification (verifyIdentity, below) is deliberately
 * isolated as its own step, separate from tenant resolution. Today it's
 * email + password. When phone + OTP is eventually built (flagged as
 * high-priority, parked only on the SMS provider dependency — see the
 * roadmap doc), it becomes a second identity-verification path that
 * feeds the exact same resolveTenantsAndIssueSession() below — tenant
 * resolution, the pre-auth token mechanism, and the tenant picker don't
 * need to be touched at all when that day comes.
 */

export interface AuthenticatedTenantUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedTenantUserResponse;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export type AuthResult =
  | ({ status: "authenticated" } & LoginResponse)
  | { status: "select_tenant"; preAuthToken: string; tenants: TenantOption[] }
  | { status: "no_tenant"; preAuthToken: string };

const PRE_AUTH_TOKEN_TTL = "5m";

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

  async login(params: { email: string; password: string }): Promise<AuthResult> {
    const user = await this.verifyIdentity(params.email, params.password);
    return this.resolveTenantsAndIssueSession(user);
  }

  /**
   * Isolated identity-verification step — the seam described above.
   * Everything after this point (tenant resolution) is identical no
   * matter how identity was confirmed.
   */
  private async verifyIdentity(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.users
      .createQueryBuilder("user")
      .where("user.email = :email", { email: normalizedEmail })
      .andWhere("user.isActive = :active", { active: true })
      .getOne();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  /**
   * Given a confirmed identity, works out what happens next: straight
   * in (exactly one active tenant), a picker (several), or routed to
   * setup (none yet).
   */
  private async resolveTenantsAndIssueSession(user: User): Promise<AuthResult> {
    const memberships = await this.tenantUsers.find({
      where: { userId: user.id, isActive: true },
      relations: { tenant: true },
    });

    const activeMemberships = memberships.filter(
      (membership) => membership.tenant?.isActive,
    );

    if (activeMemberships.length === 0) {
      const preAuthToken = await this.issuePreAuthToken(user.id);
      return { status: "no_tenant", preAuthToken };
    }

    if (activeMemberships.length === 1) {
      const response = await this.buildLoginResponse(
        user,
        activeMemberships[0].tenant,
      );
      return { status: "authenticated", ...response };
    }

    const preAuthToken = await this.issuePreAuthToken(user.id);
    return {
      status: "select_tenant",
      preAuthToken,
      tenants: activeMemberships.map((membership) => ({
        id: membership.tenant.id,
        name: membership.tenant.name ?? membership.tenant.slug,
        slug: membership.tenant.slug,
      })),
    };
  }

  /**
   * Second step for the multi-tenant case — exchanges a pre-auth token
   * (identity already confirmed, no tenant chosen yet) plus a chosen
   * tenant for a real, tenant-scoped session.
   */
  async selectTenant(preAuthToken: string, tenantId: string): Promise<LoginResponse> {
    let payload: AuthJwtPayload;

    try {
      payload = await this.jwt.verifyAsync<AuthJwtPayload>(preAuthToken, {
        secret: getRequiredEnv("JWT_ACCESS_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired session — please log in again.");
    }

    if (payload.tokenType !== "pre_auth") {
      throw new UnauthorizedException("Invalid token for tenant selection.");
    }

    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException("User account is inactive or no longer exists.");
    }

    const membership = await this.tenantUsers.findOne({
      where: { userId: user.id, tenantId, isActive: true },
      relations: { tenant: true },
    });

    if (!membership || !membership.tenant?.isActive) {
      throw new ForbiddenException("You do not belong to that cooperative.");
    }

    return this.buildLoginResponse(user, membership.tenant);
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

    if (payload.tokenType !== "refresh" || !payload.tenantId) {
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

  /**
   * Deliberately minimal payload — sub + tokenType only, no
   * tenantId/roles/permissions — so this token is structurally
   * incapable of being mistaken for a real session anywhere else in the
   * app (JwtStrategy now rejects anything that isn't tokenType:
   * "access" outright, and even if that check didn't exist, every
   * tenant-scoped or permission-gated route would fail on the missing
   * claims). Good for exactly one thing: calling selectTenant().
   */
  private async issuePreAuthToken(userId: string): Promise<string> {
    const payload: AuthJwtPayload = {
      sub: userId,
      tokenType: "pre_auth",
    };

    return this.jwt.signAsync(payload, { expiresIn: PRE_AUTH_TOKEN_TTL });
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
