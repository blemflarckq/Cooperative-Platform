import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./require-permissions.decorator";
import { Request } from 'express'; // or 'fastify'
import { IS_PUBLIC_KEY } from "../auth/public.decorator";


/**
 * PermissionsGuard checks expanded permissions from req.user.permissions.
 */

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    permissions: string[];
  };
}
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPerms: string[] = req.user?.permissions ?? [];
    const set = new Set(userPerms); 
    console.log(`This has these permission ${userPerms}`);

    const ok = required.every((p) => set.has(p)); //Searching through a set is much faster 0(1)
    if (!ok) throw new ForbiddenException("Insufficient permissions");

    return true;
  }
}