import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { OutboxService } from "../../../common/messaging/outbox.service";

interface IdentityEventInput {
  manager: EntityManager;
  tenantId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  actorUserId?: string | null;
  payload: Record<string, unknown>;
  correlationId?: string | null;
  causationId?: string | null;
}

@Injectable()
export class IdentityOutboxService {
  constructor(private readonly outboxService: OutboxService) {}

  async publish(input: IdentityEventInput): Promise<void> {
    await this.outboxService.write({
      manager: input.manager,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        ...input.payload,
      },
      headers: {
        boundedContext: "identity",
        correlationId: input.correlationId ?? null,
        causationId: input.causationId ?? null,
      },
    });
  }
}