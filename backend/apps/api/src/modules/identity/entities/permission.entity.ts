import { Column, Entity, Index, BeforeInsert, BeforeUpdate } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";

/**
 * Permission is a global definition, like "loan.issue".
 * We assign roles per tenant, and roles expand to permissions.
 */
@Entity("permissions")
export class Permission extends BaseEntity {
  /**
   * Optional split for easier grouping/filtering in admin UIs.
   * Example: tenant_users, loans, contributions, reports
   */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  resource!: string;

  /**
   * Example: create, read, update, deactivate, approve, post
   */
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  /**
   * Canonical unique permission key used by guards/services.
   * Example: tenant_users:create
   */
  @Index('uq_permissions_key', { unique: true })
  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  // --- Logic Hooks ---
  @BeforeInsert()
  @BeforeUpdate()
  generateCode() {
    // We lowercase and replace spaces with underscores to keep the key "web-safe"
    const cleanResource = this.resource.toLowerCase().trim().replace(/\s+/g, '_');
    const cleanAction = this.action.toLowerCase().trim().replace(/\s+/g, '_');
    
    this.code = `${cleanResource}:${cleanAction}`;
  }

}