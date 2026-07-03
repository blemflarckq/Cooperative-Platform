import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Tenant } from "./entities/tenant.entity";
import { User } from "./entities/user.entity";
import { TenantUser } from "./entities/tenant-user.entity";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { TenantUserRole } from "./entities/tenant-user-role.entity";
import { UserInvitation } from "./entities/user-invitation.entity";

import { OutboxModule } from "../../common/messaging/outbox.module";
//import { TenancyModule } from "../../common/tenancy/tenant.module";

import { TenantUsersController } from "./controllers/tenant-users.controller";
import { TenantUserRolesController } from "./controllers/tenant-user-roles.controller";
import { TenantUserInvitationsController } from "./controllers/tenant-user-invitations.controller";

import { TenantUsersService } from "./services/tenant-users.service";
import { TenantUserRolesService } from "./services/tenant-user-roles.service";
import { IdentityOutboxService } from "./services/identity-outbox.service";
import { TenantContextService } from "../../common/tenancy/tenant-context.service";
import { TenantUserInvitationsService } from "./services/tenant-user-invitations.service";

/**
 * IdentityModule groups all identity + tenancy entities.
 * Even if controllers/services live elsewhere, keeping entities together is clean.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant, 
      User, 
      TenantUser, 
      Role, 
      Permission, 
      TenantUserRole,
      UserInvitation,
    ]),
    OutboxModule,
    //TenancyModule,
  ],
  controllers: [
    TenantUsersController,
    TenantUserRolesController,
    TenantUserInvitationsController,
  ],
  providers: [
    TenantUsersService,
    TenantUserRolesService,
    IdentityOutboxService,
    TenantContextService,
    TenantUserInvitationsService,
  ],
  exports: [TypeOrmModule, TenantUsersService, TenantUserRolesService/*, TenantContextService*/, TenantUserInvitationsService],
})
export class IdentityModule {}