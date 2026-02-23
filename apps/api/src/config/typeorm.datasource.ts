import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Identity / audit / outbox entities (Phase 0/1)
/**
 * TypeORM DataSource for:
 * - migration generation
 * - migration running
 *
 * We use glob paths so you can set this up BEFORE creating entities.
 *
 *
 * IMPORTANT:
 * - This file is used by the TypeORM CLI for migrations.
 * - It must NOT rely on Nest DI.
 * - Keep it pure and env-driven (cloud-native).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // ✅ always false for serious apps
  logging: false,

  // Load entities automatically (works before entities exist)
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  migrations: [__dirname + '/../migrations/*.{ts,js}'],
});
