import { Column, Entity, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { TenantUser } from "./tenant-user.entity";
import { Role } from "./role.entity";

/**
 * Tenant = one cooperative / organization.
 * Multi-tenancy is implemented as:
 * - shared DB
 * - tenantId column on tenant-scoped tables
 */
@Entity("tenants")
export class Tenant extends BaseEntity {
  @Column({ unique: true })
  name!: string;

  /**
   * Tenant slug is used for user-friendly login and URLs.
   * e.g. "mabote-coop"
   */
  @Index("uq_tenants_slug", {unique: true})
  @Column({type: 'varchar', length: 120 })
  slug!: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => TenantUser, (tenantUser) => tenantUser.tenant)
  tenantUsers!: TenantUser[];

  @OneToMany(() => Role, (role) => role.tenant)
  roles!: Role[];
}