import { DataSource } from 'typeorm';
import { Role } from '../modules/identity/entities/role.entity';
import { Tenant } from '../modules/identity/entities/tenant.entity';

/**
 * Default roles to create for every tenant.
 *
 * Important:
 * - `name` is human-readable
 * - `code` is the stable internal identifier
 * - uniqueness is per tenant, not global
 */
const DEFAULT_TENANT_ROLES: Array<{
  name: string;
  code: string;
  description: string;
}> = [
  {
    name: 'Tenant Administrator',
    code: 'tenant_admin',
    description: 'Full administrative access within the tenant.',
  },
  {
    name: 'Treasurer',
    code: 'treasurer',
    description: 'Manages financial operations, loans, repayments, and payouts.',
  },
  {
    name: 'Secretary',
    code: 'secretary',
    description: 'Manages members, roster administration, and operational records.',
  },
  {
    name: 'Member',
    code: 'member',
    description: 'Standard cooperative member with self-service access.',
  },
];

/**
 * Seeds default roles for every tenant found in the database.
 *
 * Idempotent:
 * - Safe to run multiple times
 * - Will not duplicate roles for the same tenant
 */
export async function seedRoles(dataSource: DataSource) {
  const tenantRepo = dataSource.getRepository(Tenant);
  const roleRepo = dataSource.getRepository(Role);

  const tenants = await tenantRepo.find();
  let created = 0;

  for (const tenant of tenants) {
    for (const roleDef of DEFAULT_TENANT_ROLES) {
      const existing = await roleRepo.findOne({
        where: {
          tenantId: tenant.id,
          code: roleDef.code,
        },
      });

      if (existing) continue;

      const role = roleRepo.create({
        tenantId: tenant.id,
        name: roleDef.name,
        code: roleDef.code,
        description: roleDef.description,
        isActive: true,
      });

      await roleRepo.save(role);
      created++;
    }
  }

  console.log(`✅ Roles seeded. Created: ${created}`);
}