import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);

  app.enableCors({
    origin: 'http://localhost:5173', // Your Vite frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies or auth headers
  });
  
  await app.listen(process.env.port ?? 3000);
}
void bootstrap().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
});
