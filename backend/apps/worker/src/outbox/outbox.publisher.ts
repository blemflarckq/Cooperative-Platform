import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { RabbitMQProvider } from "../messaging/rabbitmq.provider";
import { OutboxEvent } from "../../../api/src/common/messaging/outbox-event.entity";

/**
 * Publisher uses a DB transaction to "claim" events and publish them.
 * For production: use SKIP LOCKED and a dedicated claimedAt/claimedBy.
 * For portfolio v1: pessimistic locking is acceptable and clear.
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(private readonly ds: DataSource, private readonly rabbit: RabbitMQProvider) {}

  async publishBatch(limit = 50): Promise<void> {
    await this.ds.transaction(async (tx) => {
      const repo = tx.getRepository(OutboxEvent);

      const events = await repo
        .createQueryBuilder("e")
        .where("e.publishedAt IS NULL")
        .orderBy("e.occurredAt", "ASC")
        .limit(limit)
        .setLock("pessimistic_write")
        .getMany();

      for (const e of events) {
        try {
          this.rabbit.ch.publish(
            process.env.RABBITMQ_EXCHANGE!,
            e.eventType,
            Buffer.from(JSON.stringify(e.payload)),
            { contentType: "application/json", persistent: true },
          );

          e.publishedAt = new Date();
          await repo.save(e);
        } catch (err: any) {
          e.attempts += 1;
          await repo.save(e);
          const errorMessage = err instanceof Error? err.stack : String(err);
          this.logger.error(`Publish failed: ${e.id} ${e.eventType}`, errorMessage);
        }
      }
    });
  }
}