import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '../outbox/outbox-event.entity';
import { getRequiredEnv } from '../config/env';

/**
 * WorkerDatabaseModule is a deliberately minimal TypeORM connection for the
 * worker process — it only registers the entities the worker actually
 * touches (just OutboxEvent for now), rather than reusing the api app's
 * TypeOrmRootModule, which auto-loads every entity in the whole system.
 * The worker has no business holding repositories for User, JournalEntry,
 * etc.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: getRequiredEnv('DATABASE_URL'),
      synchronize: false,
      entities: [OutboxEvent],
    }),
  ],
})
export class WorkerDatabaseModule {}