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

  @Column()
  mobile!: string;

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