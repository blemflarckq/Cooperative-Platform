import { Column, Entity, Index, ManyToOne, OneToMany, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "./tenant.entity";
import { TenantUserRole } from "./tenant-user-role.entity";
import { RolePermission } from "./role-permission.entity";

/**
 * Role is tenant scoped definition (ADMIN, TREASURER, MEMBER).
 * A user's role assignment is tenant-scoped (see TenantUserRole).
 */
@Entity("roles")
@Unique('uq_roles_tenant_name', ['tenantId', 'name'])
@Unique('uq_roles_tenant_code', ['tenantId', 'code'])
export class Role extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.roles, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * Tenant-local stable key, e.g. tenant_admin, treasurer, member
   * Uniqueness should be per tenant, not global.
   */
  @Column({ type: 'varchar', length: 200 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => TenantUserRole, (tenantUserRole) => tenantUserRole.role)
  tenantUserRole!: TenantUserRole;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions!: RolePermission[];
  
}