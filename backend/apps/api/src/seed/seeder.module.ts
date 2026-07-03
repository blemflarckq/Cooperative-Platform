import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tenant } from "../modules/identity/entities/tenant.entity";
import { User } from "../modules/identity/entities/user.entity";
import { TenantUser } from "../modules/identity/entities/tenant-user.entity";
import { Role } from "../modules/identity/entities/role.entity";
import { Permission } from "../modules/identity/entities/permission.entity";
import { RolePermission } from "../modules/identity/entities/role-permission.entity";
import { TenantUserRole } from "../modules/identity/entities/tenant-user-role.entity";
import { SeederService } from "./seeder.service";



@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, TenantUser, Role, Permission, TenantUserRole, RolePermission])],
  providers: [SeederService],
  exports: [TypeOrmModule, SeederService],
})
export class SeederModule {}