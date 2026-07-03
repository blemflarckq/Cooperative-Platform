import { DataSource } from 'typeorm';
import { Tenant } from '../modules/identity/entities/tenant.entity';

/**
 * Default tenants to seed.
 *
 * For now we seed a single demo tenant to make local development,
 * testing, and portfolio screenshots easier.
 *
 * You can later expand this list or make it environment-driven.
 */

const DEFAULT_TENANTS: Array<{
  name: string;
  slug: string;
  isActive?: boolean;
}> = [
  {
    name: process.env.SEED_TENANT_NAME ?? 'Demo Cooperative',
    slug: process.env.SEED_TENANT_SLUG ?? 'demo-coop',
    isActive: true,
  },
];

/**
 * Seeds tenants in an idempotent way.
 *
 * Idempotent means:
 * - safe to run multiple times
 * - existing tenants are not duplicated
 */
export async function seedTenants(dataSource: DataSource) {
  const tenantRepo = dataSource.getRepository(Tenant);

  let created = 0;

  for (const tenantDef of DEFAULT_TENANTS) {
    const existing = await tenantRepo.findOne({
      where: [{ slug: tenantDef.slug }, { name: tenantDef.name }],
    });

    if (existing) continue;

    const tenant = tenantRepo.create({
      name: tenantDef.name,
      slug: tenantDef.slug,
      isActive: tenantDef.isActive ?? true,
    });

    await tenantRepo.save(tenant);
    created++;
  }

  console.log(`✅ Tenants seeded. Created: ${created}`);
}