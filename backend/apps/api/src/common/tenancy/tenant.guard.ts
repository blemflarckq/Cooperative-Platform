import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Scope } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from 'express';
import { TenantContextService } from "./tenant-context.service";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

/**
 * TenantGuard ensures every protected request has a tenant context.
 *
 * Rules:
 * - Requires X-Tenant-Id header
 * - If authenticated, JWT tenantId must match header tenantId
 *
 * Guard order (see api.module.ts) is: JwtAuthGuard -> TenantGuard ->
 * PermissionsGuard. That order is what guarantees req.user is already
 * populated by the time this guard runs for any non-public route — this
 * guard does not assume that blindly, and fails safely if it's ever untrue.
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | string[];
    permissions: string[];
  };
}

@Injectable({ scope: Scope.REQUEST })
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenantCtx: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const { "x-tenant-id": headerTenantId } = req.headers;

    if (!headerTenantId) {
      throw new ForbiddenException("Missing X-Tenant-Id header");
    }

    // Defensive: this guard expects JwtAuthGuard to have already run and
    // populated req.user for any non-public route. If that's ever not the
    // case (e.g. guard order changes), fail closed with a clear error
    // instead of throwing an unhandled TypeError trying to read req.user.
    if (!req.user) {
      throw new ForbiddenException("Request is not authenticated");
    }

    if (req.user.tenantId && req.user.tenantId !== headerTenantId) {
      throw new ForbiddenException("Token tenant does not match request tenant");
    }

    this.tenantCtx.setTenantId(headerTenantId as string);
    req.user.tenantId = headerTenantId;
    return true;
  }
}
