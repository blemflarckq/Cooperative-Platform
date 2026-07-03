import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Observable } from "rxjs";
import { finalize, tap } from "rxjs/operators";
import { Repository } from "typeorm";
import { TenantContextService } from "../tenancy/tenant-context.service";
import { AuditLog } from "./audit-log.entity";
import { Request } from 'express';

/**
 * AuditInterceptor logs only mutating requests by default.
 * It uses TenantContextService so tenantId is consistent everywhere.
 */

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    tenantId: string;
    permissions: string[];
  }
}

@Injectable({ scope: Scope.REQUEST })
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantCtx: TenantContextService,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const res = http.getResponse();

    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    // 2. Skip if it's the login route (No user/tenant context exists yet)
    const isLogin = req.url.includes('/auth/login') || req.url.includes('accept-invitation') || req.url.includes('/auth/refresh'); 
    if (!isMutating || isLogin) return next.handle();    

    const occurredAt = new Date();


    /**
     * RxJS operators manipulate the responses. finalize() is one such operator.
     * the finalize operator will run regardless of whether the request succeeds or crashes.
     * The pipe wraps the request and waits for the route handler to complete
     */
    console.log('interceptor Provider defined?', !!this.tenantCtx);

    return next.handle().pipe(
      tap(() => {
          // Tenant context is set by TenantGuard (for protected routes).
          // For non-tenant routes, you can skip audit or set tenantId null.
          // Here we enforce tenant for mutations.
          const tenantId = this.tenantCtx.getTenantId();
          console.log(`Current Tenant ID ${tenantId}`);


          this.audits.save({
            tenantId,
            actorUserId: req.user?.sub ?? null,
            method: req.method,
            path: req.originalUrl ?? req.url,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            statusCode: res.statusCode ?? 500,
            occurredAt,
            metadata: {
              ip: req.ip,
              userAgent: req.headers["user-agent"],
            },
          })
          .then(() =>{
            //some success message
          }) 
        .catch((auditError) => {
          console.error('Audit Logging Failed:', auditError);
        });
      }),
    );
  }
}