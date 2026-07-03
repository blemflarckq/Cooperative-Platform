import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from "../../../common/db/base.entity";
import { Role } from './role.entity';
import { Permission } from './permission.entity';

/**
 * Joins a tenant-scoped role to a global permission.
 * This is how a tenant defines what a role is allowed to do.
 */
@Entity({ name: 'role_permissions' })
@Unique('uq_role_permissions_role_permission', ['roleId', 'permissionId'])
export class RolePermission extends BaseEntity{
  @Index()
  @Column({ type: 'uuid' })
  roleId!: string;

  @Index()
  @Column({ type: 'uuid' })
  permissionId!: string;

  @ManyToOne(() => Role, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @ManyToOne(() => Permission, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'permissionId' })
  permission!: Permission;
}