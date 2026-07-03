import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '../../../api/src/common/messaging/outbox-event.entity';
import { OutboxPublisher } from './outbox.publisher';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  providers: [OutboxPublisher],
  exports: [OutboxPublisher],
})
export class WorkerOutboxModule {}