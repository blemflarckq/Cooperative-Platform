// common/tenancy/tenancy.module.ts
import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';

/**
 * TenancyModule provides tenant-context primitives globally.
 *
 * TenantGuard is provided here so it's injectable, but it is registered as
 * a global APP_GUARD in ApiModule only (see api.module.ts) — keeping guard
 * *registration* in one place guarantees the intended execution order
 * (JwtAuthGuard -> TenantGuard -> PermissionsGuard) instead of leaving it
 * dependent on module instantiation order across two files.
 */
@Global()  // Makes everything in this module available everywhere
@Module({
  providers: [
    TenantContextService,
    TenantGuard,
  ],
  exports: [TenantContextService, TenantGuard],
})
export class TenancyModule {}
