import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { OutboxEvent } from './outbox-event.entity';

/**
 * OutboxService is used from command handlers:
 * Always pass the EntityManager from the current transaction.
 */

export interface WriteOutboxEventInput {
  manager: EntityManager;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  /**
   * Writes an outbox message in the SAME transaction as the business change.
   */
  async write(input: WriteOutboxEventInput): Promise<OutboxEvent> {
    const row = input.manager.create(OutboxEvent, {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: {
        eventId: randomUUID(),
        ...input.payload,
      },
      headers: input.headers ?? null,
      occurredAt: new Date(),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });

    return await input.manager.save(OutboxEvent, row);
  }
}