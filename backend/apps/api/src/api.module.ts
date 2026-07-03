import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { TypeOrmRootModule } from './config/typeorm.module';
import { CommonModule } from "./common/common.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { TenancyModule } from "./common/tenancy/tenant.module";

import { JwtAuthGuard } from "./common/auth/jwt-auth.guard";
import { TenantGuard } from "./common/tenancy/tenant.guard";
import { PermissionsGuard } from "./common/rbac/permissions.guard";
import { AuditInterceptor } from "./common/audit/audit.interceptor";
import { Reflector } from "@nestjs/core";

import { SeederModule } from "./seed/seeder.module";
import { SchemesModule } from "./modules/schemes/schemes.module";

import { AccountingModule } from "./modules/accounting/accounting.module";
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
  ],
  providers: [
    //Reflector,
    // Global guards (applied to all routes by default)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    //{ provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Global audit interceptor (mutating routes)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
})
export class ApiModule {}
