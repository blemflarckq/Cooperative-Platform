import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../db/base.entity";

/**
 * Transactional outbox row:
 * written with domain state changes in the SAME transaction.
 * - to be published to RabbitMQ by a worker
 * This prevents "DB wrote but event failed to publish" inconsistencies.
 */
@Entity("outbox_events")
export class OutboxEvent extends BaseEntity {
  @Column()
  aggregateType!: string; // e.g "Loan, tenant, user"

  @Column()
  aggregateId!: string; //Exact Id of entity that changed

  @Index()
  @Column()
  eventType!: string; // routing key e.g. "user.created"

  @Column({ type: "jsonb" }) //contains state change e.g new interest or new email
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