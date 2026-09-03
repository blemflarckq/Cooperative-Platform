import { DataSource } from 'typeorm';
import { Tenant } from '../modules/identity/entities/tenant.entity';
import { Role } from '../modules/identity/entities/role.entity';
import {
  DEFAULT_TENANT_ROLES,
  bootstrapRolesForTenant,
} from '../modules/identity/services/tenant-role-bootstrap';

/**
 * Thin wrapper — the actual role definitions now live in
 * tenant-role-bootstrap.ts, shared with self-service tenant creation
 * (Setup). This script's job is just: for every existing tenant, make
 * sure it has the default roles.
 */
export async function seedRoles(dataSource: DataSource) {
  const tenantRepo = dataSource.getRepository(Tenant);
  const roleRepo = dataSource.getRepository(Role);

  const tenants = await tenantRepo.find();
  let created = 0;

  for (const tenant of tenants) {
    const before = await roleRepo.count({ where: { tenantId: tenant.id } });
    await bootstrapRolesForTenant(dataSource.manager, tenant.id);
    const after = await roleRepo.count({ where: { tenantId: tenant.id } });
    created += after - before;
  }

  console.log(
    `✅ Roles seeded. Created: ${created} (of ${DEFAULT_TENANT_ROLES.length} default roles per tenant)`,
  );
}
