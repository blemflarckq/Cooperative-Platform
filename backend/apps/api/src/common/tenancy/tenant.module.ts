// common/tenancy/tenancy.module.ts
import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { Reflector } from "@nestjs/core";
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';

@Global()  // Makes everything in this module available everywhere
@Module({
  providers: [
    //Reflector,
    TenantContextService, 
    //TenantGuard,
    { provide: APP_GUARD, useClass: TenantGuard },
    ],
  exports: [TenantContextService],
})
export class TenancyModule {}