import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../db/base.entity";

/**
 * Audit logs must be tenant-scoped in a multi-tenant system.
 * set tenantID in the interceptor
 */
@Entity("audit_log")
export class AuditLog extends BaseEntity {
  @Index()
  @Column("uuid")
  tenantId!: string | string[];

  @Column({ type: "uuid", nullable: true })
  actorUserId!: string | null;

  @Column()
  method!: string;

  @Column()
  path!: string;

  @Column({ type: "int" })
  statusCode!: number;

  @Column({ type: "timestamptz" })
  occurredAt!: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, any> | null;
}