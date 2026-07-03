import { Injectable, OnModuleInit } from "@nestjs/common";
import { OutboxPublisher } from "./outbox.publisher";

/**
 * Lightweight polling loop:
 * - avoids adding cron libs initially
 * - easy to understand and reliable enough for v1
 */
@Injectable()
export class OutboxScheduler implements OnModuleInit {
  constructor(private readonly publisher: OutboxPublisher) {}

  onModuleInit() {
    setInterval(() => {
      try {
      void this.publisher.publishBatch(50);
      } catch (error) {
      void this.publisher.publishBatch(50);
      }
    }, 1000); // every 1s; tune later
  }
}