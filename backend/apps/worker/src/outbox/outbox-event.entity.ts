import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Transactional outbox row — mirrors the table the API writes to.
 *
 * NOTE: this is intentionally a local duplicate of
 * apps/api/src/common/messaging/outbox-event.entity.ts, not a shared
 * import, for the same reason as config/env.ts in this app (see comment
 * there). Both map to the same `outbox_events` table and MUST be kept in
 * sync if columns change — this is a known, deliberate tradeoff, not an
 * oversight. Worth resolving properly via libs/common once there's time to
 * set up and test path-alias rewriting for the build.
 */
@Entity("outbox_events")
export class OutboxEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @Column()
  aggregateType!: string;

  @Column()
  aggregateId!: string;

  @Index()
  @Column()
  eventType!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  headers!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  lastError!: string | null;

  @Column({ type: "timestamptz" })
  occurredAt!: Date;

  @Index()
  @Column({ type: "timestamptz", nullable: true })
  publishedAt?: Date | null;

  @Column({ type: "int", default: 0 })
  attempts!: number;
}