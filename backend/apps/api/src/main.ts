import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ApiModule } from './api.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { getRequiredEnv } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  // CORS origin comes from the environment — never hardcode a dev URL into
  // a production artifact. Comma-separated list supports multiple origins
  // (e.g. staging + production frontend).
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : 'http://localhost:5173';

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enforces the class-validator decorators already present on our DTOs.
  // whitelist strips unknown properties; forbidNonWhitelisted rejects a
  // request outright if it sends fields we don't expect, rather than
  // silently ignoring them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Fail fast at startup if required secrets are missing, rather than
  // discovering it the first time someone tries to log in.
  getRequiredEnv('JWT_ACCESS_SECRET');
  getRequiredEnv('JWT_REFRESH_SECRET');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}
void bootstrap().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
});
