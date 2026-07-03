import { Scope, CanActivate, ExecutionContext, ForbiddenException, Injectable, Inject, OnModuleInit  } from "@nestjs/common";
import { TenantContextService } from "./tenant-context.service";
import { Request } from 'express'; // or 'fastify'
import { IS_PUBLIC_KEY } from "../auth/public.decorator";
import { Reflector } from "@nestjs/core";
import { ModuleRef } from "@nestjs/core";
import { ContextIdFactory } from '@nestjs/core';

/**
 * TenantGuard ensures every protected request has a tenant context.
 *
 * Rules:
 * - Requires X-Tenant-Id header
 * - If authenticated, JWT tenantId must match header tenantId
 * 
 * Notes:
 * - A gurad must implement the CanACtivate interface to allow or deny a request to proceed to route handler.
 * - This is why it accepts an instance of an ExecutionContext as an argument.
 */

// Define what your User object actually looks like
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string | string[];
    permissions: string[];
  };
}

@Injectable({ scope: Scope.REQUEST })
export class TenantGuard implements CanActivate, OnModuleInit   {
  constructor(
    private readonly tenantCtx: TenantContextService,
    private readonly reflector: Reflector,
    //private readonly moduleRef: ModuleRef,
    @Inject(ModuleRef) private moduleRef: ModuleRef,
  ) {
    console.log('At this point, the guard has been created.');
  }

   onModuleInit() {
    console.log('TenantGuard reflector?', !!this.reflector);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    console.log('TenantGuard reflector?', !!this.reflector);
    console.log('Is Provider defined?', !!this.tenantCtx);
    //console.log('The hell changed??');
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    console.log('Is the endpoint open to the public', !!isPublic);
    if(isPublic) return true;
    
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>(); //Grab the underlying http request
    
    const contextId = ContextIdFactory.getByRequest(req);
    //const tenantCtx = await this.moduleRef.resolve<TenantContextService>(TenantContextService, contextId);

    //const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
    const { "x-tenant-id": headerTenantId } = req.headers;

    if (!headerTenantId) {
      throw new ForbiddenException("Missing X-Tenant-Id header");
    }

    // If request is authenticated, ensure token tenant matches header tenant.
    if (req.user?.tenantId && req.user.tenantId !== headerTenantId) {
      throw new ForbiddenException("Token tenant does not match request tenant");
    }

    this.tenantCtx.setTenantId(headerTenantId);
    req.user.tenantId = headerTenantId;
    return true;
  }
}