import 'reflect-metadata';
import { AppDataSource } from '../config/typeorm.datasource';
import { seedPermissions } from './permissions.seed';

/**
 * Loads ONLY the permission list — reference data the application needs
 * in order to work at all — and nothing else.
 *
 * The full seed (seed.ts) also creates demo tenants and demo data, which
 * is right for development and wrong for a real environment. Without the
 * permissions a new cooperative's roles are created with no permissions
 * and nobody can do anything.
 *
 * Connecting applies any pending migrations first (the datasource is
 * configured to), so on a brand-new empty database this single command
 * both builds the schema and loads the permissions. It is safe to re-run:
 * it only adds permissions that are missing.
 */
async function main() {
  await AppDataSource.initialize();

  try {
    await seedPermissions(AppDataSource);
  } finally {
    await AppDataSource.destroy();
  }
}

main().then(
  () => process.exit(0),
  (error: Error) => {
    console.error('Seeding permissions failed:', error.message);
    process.exit(1);
  },
);
