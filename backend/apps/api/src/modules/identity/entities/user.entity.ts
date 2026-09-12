import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { TenantUser } from "./tenant-user.entity";

/**
 * User = global login identity.
 * A user can belong to multiple tenants.
 */
@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  // Nullable — Google/Facebook OAuth sign-in doesn't reliably provide a
  // phone number, and forcing one at that moment would mean an extra
  // wizard step just for OAuth. Native registration still REQUIRES it
  // at the DTO/form level (see register.dto.ts) — this column being
  // nullable doesn't relax that, it only accommodates the one signup
  // path that genuinely can't supply it.
  @Column({ type: 'varchar', nullable: true })
  mobile!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  passwordChangedAt!: Date | null;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => TenantUser, (tu) => tu.user)
  tenantLinks?: TenantUser[];
}