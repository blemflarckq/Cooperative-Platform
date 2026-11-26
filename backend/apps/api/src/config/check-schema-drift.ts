import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Compares a database against the schema the code expects, and reports
 * every difference. READ-ONLY: it runs no migrations, creates nothing,
 * and changes nothing — safe to point at any database, including a live
 * one. (It even skips the automatic extension install a normal connection
 * performs.)
 *
 *   npm run db:drift
 *
 * Exit code 0 = the database matches; 1 = it differs; 2 = it couldn't run.
 *
 * What it prints is the list of changes it WOULD take to make the
 * database match the code — which is exactly "how the database has
 * drifted away from it".
 */
async function main(): Promise<number> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    return 2;
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
    installExtensions: false,
  });

  await dataSource.initialize();

  try {
    const { upQueries } = await dataSource.driver.createSchemaBuilder().log();

    if (upQueries.length === 0) {
      console.log('✅ This database matches what the code expects.');
      return 0;
    }

    console.log(`⚠️  This database differs from what the code expects (${upQueries.length} difference${upQueries.length === 1 ? '' : 's'}).`);
    console.log('   These are the changes it would take to make it match. NOTHING has been changed.\n');
    for (const { query } of upQueries) {
      console.log('  - ' + (query.length > 220 ? query.slice(0, 217) + '...' : query));
    }
    return 1;
  } finally {
    await dataSource.destroy();
  }
}

main().then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error('Could not check the database:', error.message);
    process.exit(2);
  },
);
