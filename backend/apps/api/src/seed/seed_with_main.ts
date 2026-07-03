import "reflect-metadata";
import { AppDataSource } from "../config/typeorm.datasource";
import { hashPassword } from "../common/auth/password";
import { Tenant } from "../modules/identity/entities/tenant.entity";
import { User } from "../modules/identity/entities/user.entity";
import { TenantUser } from "../modules/identity/entities/tenant-user.entity";
import { Role } from "../modules/identity/entities/role.entity";
import { Permission } from "../modules/identity/entities/permission.entity";
import { TenantUserRole } from "../modules/identity/entities/tenant-user-role.entity";
import { RolePermission } from "../modules/identity/entities/role-permission.entity";

/**
 * Seed is designed to be:
 * - safe to rerun (idempotent)
 * - environment-driven
 *
 * Usage:
 * DATABASE_URL=... node dist/apps/api/src/seed/seed.js
 * (or run via ts-node in dev)
 */
async function main() {
  await AppDataSource.initialize();

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(User);
  const tuRepo = AppDataSource.getRepository(TenantUser);
  const roleRepo = AppDataSource.getRepository(Role);
  const permRepo = AppDataSource.getRepository(Permission);
  const turRepo = AppDataSource.getRepository(TenantUserRole);
  const rpermRepo = AppDataSource.getRepository(RolePermission);

  const tenantName = process.env.SEED_TENANT_NAME ?? "Demo Cooperative";
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "demo-coop";

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.local";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Demo Admin";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  // 1) Tenant
  let tenant = await tenantRepo.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    tenant = await tenantRepo.save({ name: tenantName, slug: tenantSlug, isActive: true });
  }

  // 2) Permissions (start minimal; expand as domains grow)
  const permissionSet: Array<{ code: string; description: string }> = [
    { code: "tenant.manage", description: "Manage tenant settings" },
    { code: "user.manage", description: "Manage users within tenant" },
    { code: "role.assign", description: "Assign roles to users within tenant" },
  ];

  for (const p of permissionSet) {
    const existing = await permRepo.findOne({ where: { code: p.code } });
    if (!existing) await permRepo.save(p);
  }

  // 3) Roles
  //const roleNames = ["ADMIN", "TREASURER", "MEMBER"];
  const slug = tenantSlug.toLowerCase().replace(" ", "_");
    const rolesSets: Array<{ name: string; tenantId: string; code: string; description: string }> = [
    { name: "ADMIN", tenantId: tenant.id, code: slug + "_admin", description: tenant.name + "Administrator role" },
    { name: "TREASURER", tenantId: tenant.id, code: slug + "_finance", description: tenant.name  + "Finance Manager role" },
    { name: "MEMEBER", tenantId: tenant.id, code: slug + "_member", description: tenant.name + "Regular Member role" },
  ];


  for (const role of rolesSets) {
    let r = await roleRepo.findOne({ where: { code: role.code } });
    if (!r) r = await roleRepo.save(role);
    //roles[name] = r;
  }

  // 4) Role permissions (ADMIN gets all in seed; adjust later)
  const allPerms = await permRepo.find();
  const adminRole = await roleRepo.findOne({ where: {name: "ADMIN"}});
  for (const perm of allPerms) {
    let rp = await rpermRepo.findOne({ where: {roleId: adminRole?.id, permissionId: perm?.id }});
    if (!rp) {
      rp = await rpermRepo.save({
        roleId: adminRole?.id,
        permissionId: perm.id,
      })
    }
  }

  // 5) Admin user
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = await userRepo.save({
      email: adminEmail,
      fullName: adminName,
      passwordHash: await hashPassword(adminPass),
      isActive: true,
    });
  }

  // 6) Tenant membership link
  let tenantUser = await tuRepo.findOne({ where: { tenantId: tenant.id, userId: admin.id } });
  if (!tenantUser) {
    tenantUser = await tuRepo.save({
      tenantId: tenant.id,
      userId: admin.id,
      isActive: true,
    });
  }

  // 7) Assign ADMIN role within this tenant
  const existingTur = await turRepo.findOne({
    where: { tenantUserId: tenantUser.id, roleId: adminRole?.id },
  });
  if (!existingTur) {
    await turRepo.save({
      tenantUserId: tenantUser.id,
      roleId: adminRole?.id,
    });
  }

  // eslint-disable-next-line no-console
  console.log("✅ Seed complete:", {
    tenant: { id: tenant.id, slug: tenant.slug },
    admin: { email: admin.email },
  });

  await AppDataSource.destroy();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error("❌ Seed failed:", e);
  try {
    await AppDataSource.destroy();
  } catch {/* Ignore errors during cleanup */}
  process.exit(1);
});