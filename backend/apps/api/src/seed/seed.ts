import { NestFactory } from '@nestjs/core';
import { ApiModule } from '../api.module'; // A small module for seeding
import { SeederService } from './seeder.service';
import { AppDataSource } from "../config/typeorm.datasource";
import { seedTenants } from "./tenants.seed";
import { seedRoles } from "./roles.seed";
import { seedPermissions } from "./permissions.seed";

async function bootstrap() {
  // Use createApplicationContext for a headless "CLI" app (no HTTP listener)
  const app = await NestFactory.createApplicationContext(ApiModule);
  await AppDataSource.initialize();
   
  const seeder = app.get(SeederService);
  
  try {
    console.log('🌱 Starting Seeding process...');
    await seedTenants(AppDataSource);
    await seedPermissions(AppDataSource);
    // seedRoles now also grants each role's permissions (via the shared
    // bootstrapRolesForTenant) — role-permissions.seed.ts's separate step
    // was fully redundant once that changed, so it's been removed.
    await seedRoles(AppDataSource);
    await seeder.run();
    console.log('✅ Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();