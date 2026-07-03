import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";
import { TenantUserRole } from "./tenant-user-role.entity";

/**
 * TenantUser is a membership link: user <-> tenant.
 * This is where you'd later store tenant-specific profile fields (member number, etc.).
 */
@Entity("tenant_users")
@Index(["tenantId", "userId"], { unique: true })
export class TenantUser extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, (t: Tenant) => t.tenantUsers, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => User, (u: User) => u.tenantLinks, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "userId" })
  user!: User;

  /**
   * Useful for invite/onboarding flows later.
   */
  @Column({ type: 'varchar', length: 50, default: 'active' })
  status?: 'invited' | 'active' | 'suspended' | 'revoked';

  @Column({ type: 'boolean', default: true })
  isActive?: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt?: Date | null;

  @OneToMany(() => TenantUserRole, (tenantUserRole) => tenantUserRole.tenantUser)
  roles!: TenantUserRole[];
}