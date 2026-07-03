import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { TenantUser } from "./tenant-user.entity";
import { Role } from "./role.entity";

/**
 * TenantUserRole assigns a global role to a user *within a tenant*.
 * This is the cornerstone of multi-tenant RBAC.
 */
@Entity("tenant_user_roles")
@Index(["tenantUserId", "roleId"], { unique: true })
export class TenantUserRole extends BaseEntity {
  @Column("uuid")
  tenantUserId!: string;

  @ManyToOne(() => TenantUser, (tu) => tu.roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantUserId" })
  tenantUser!: TenantUser;

  @Column("uuid")
  roleId!: string;

  @ManyToOne(() => Role, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "roleId" })
  role!: Role;
}