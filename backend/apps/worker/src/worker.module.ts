import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { WorkerDatabaseModule } from './database/worker-database.module';
import { WorkerOutboxModule } from './outbox/worker-outbox.module';

@Module({
  imports: [WorkerDatabaseModule, WorkerOutboxModule],
  controllers: [WorkerController],
  providers: [],
})
export class WorkerModule {}