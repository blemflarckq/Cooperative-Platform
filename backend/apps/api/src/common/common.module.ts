import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtStrategy } from "./auth/jwt.strategy";
//import { TenantContextService } from "./tenancy/tenant-context.service";
import { AuditLog } from "./audit/audit-log.entity";
//import { AuditInterceptor } from "./audit/audit.interceptor";
import { IdentityModule } from "../modules/identity/identity.module";

/**
 * CommonModule hosts cross-cutting concerns:
 * - auth
 * - tenancy context
 * - audit storage entity
 *
 * This keeps AppModule clean.
 */
@Module({
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([AuditLog]),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy/*, TenantContextService*/],
  exports: [JwtModule/*, TenantContextService*/,TypeOrmModule],
})
export class CommonModule {}