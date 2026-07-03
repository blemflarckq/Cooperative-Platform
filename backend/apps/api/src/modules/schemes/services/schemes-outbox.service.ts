import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { OutboxEvent } from "../../../common/messaging/outbox-event.entity";

interface PublishSchemeEventInput {
  manager: EntityManager;
  tenantId: string;
  aggregateId: string;
  aggregateType: "cooperative_scheme" | "operating_cycle" | "cycle_participant";
  eventType: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class SchemesOutboxService {
  async publish(input: PublishSchemeEventInput): Promise<void> {
    const event = input.manager.create(OutboxEvent, {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      headers: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        module: "schemes",
      },
      occurredAt: new Date(),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });

    await input.manager.save(OutboxEvent, event);
  }
}