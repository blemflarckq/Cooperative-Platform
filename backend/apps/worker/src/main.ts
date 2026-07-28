import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
//import { getRequiredEnv } from '../../api/src/config/env';
import { getRequiredEnv } from './config/env';

async function bootstrap() {
  // Fail fast if RabbitMQ config is missing, rather than discovering it
  // via a raw, unhandled exception the first time the publisher tries to
  // connect or publish.
  getRequiredEnv('RABBITMQ_URL');
  getRequiredEnv('RABBITMQ_EXCHANGE');

  const app = await NestFactory.create(WorkerModule);
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Worker listening on port ${port}`);
}
void bootstrap().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
