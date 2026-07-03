import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { OutboxEvent } from "../../../common/messaging/outbox-event.entity";

interface PublishAccountingEventInput {
  manager: EntityManager;
  tenantId: string;
  aggregateId: string;
  aggregateType:
    | "account"
    | "journal_entry"
    | "journal_line"
    | "accounting_period"
    | "accounting_settings"
    | "contribution";
  eventType: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class AccountingOutboxService {
  async publish(input: PublishAccountingEventInput): Promise<void> {
    const event = input.manager.create(OutboxEvent, {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      headers: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        module: "accounting",
      },
      occurredAt: new Date(),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });

    await input.manager.save(OutboxEvent, event);
  }
}