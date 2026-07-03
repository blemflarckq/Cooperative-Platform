import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);
  await app.listen(process.env.port ?? 3000);
}
void bootstrap().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
});
