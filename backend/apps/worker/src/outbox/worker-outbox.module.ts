import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { OutboxEvent } from '../../../api/src/common/messaging/outbox-event.entity';
import { OutboxEvent } from "./outbox-event.entity";
import { OutboxPublisher } from './outbox.publisher';
import { OutboxScheduler } from './outbox.schedular';
import { RabbitMQProvider } from '../messaging/rabbitmq.provider';

/**
 * WorkerOutboxModule wires the full outbox -> RabbitMQ pipeline:
 * - RabbitMQProvider: connects to RabbitMQ, asserts exchange/queue
 * - OutboxPublisher: reads unpublished OutboxEvent rows and publishes them
 * - OutboxScheduler: calls the publisher on an interval
 *
 * Previously, none of these three were actually registered/imported
 * anywhere in the running app — this module existed but was never wired
 * into WorkerModule, so the entire event pipeline was dormant.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  providers: [RabbitMQProvider, OutboxPublisher, OutboxScheduler],
  exports: [OutboxPublisher],
})
export class WorkerOutboxModule {}
