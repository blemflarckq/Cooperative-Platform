import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { TypeOrmRootModule } from './config/typeorm.module';
import { CommonModule } from "./common/common.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { TenancyModule } from "./common/tenancy/tenant.module";

import { JwtAuthGuard } from "./common/auth/jwt-auth.guard";
import { TenantGuard } from "./common/tenancy/tenant.guard";
import { PermissionsGuard } from "./common/rbac/permissions.guard";
import { AuditInterceptor } from "./common/audit/audit.interceptor";

import { SeederModule } from "./seed/seeder.module";
import { SchemesModule } from "./modules/schemes/schemes.module";

import { AccountingModule } from "./modules/accounting/accounting.module";
import { HealthModule } from "./common/health/health.module";
import { LoansModule } from "./modules/loans/loans.module";
/**
 * AppModule wires global guards/interceptors.
 *
 * Guard order matters:
 * 1) JWT populates req.user
 * 2) TenantGuard validates tenant header and sets TenantContext
 * 3) PermissionsGuard checks permissions from req.user
 */

@Module({
  imports: [
    TypeOrmRootModule, 
    CommonModule, 
    IdentityModule, 
    SeederModule, 
    TenancyModule,
    SchemesModule,
    AccountingModule,
    HealthModule,
    LoansModule,
    // Baseline rate limiting: 100 requests per 60s window per client by
    // default. Money-moving endpoints (login, transfers) can override this
    // per-route with @Throttle() later if a tighter limit is warranted.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    // Global guards, applied to all routes in this exact order:
    // 1) JwtAuthGuard populates req.user (or lets @Public() routes through)
    // 2) TenantGuard validates the tenant header against req.user and sets
    //    TenantContext for the rest of the request
    // 3) PermissionsGuard checks permissions from req.user
    //
    // All three are registered here, in one place, so the order is
    // guaranteed rather than depending on which module happens to be
    // instantiated first — TenancyModule no longer registers TenantGuard
    // as a global guard itself (see tenant.module.ts).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Global audit interceptor (mutating routes)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
})
export class ApiModule {}
