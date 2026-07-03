import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../common/auth/password';
import { Tenant } from '../modules/identity/entities/tenant.entity';
import { User } from '../modules/identity/entities/user.entity';
import { TenantUser } from '../modules/identity/entities/tenant-user.entity';
import { Role } from '../modules/identity/entities/role.entity';
import { Permission } from '../modules/identity/entities/permission.entity';
import { TenantUserRole } from '../modules/identity/entities/tenant-user-role.entity';
import { RolePermission } from '../modules/identity/entities/role-permission.entity';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TenantUser) private readonly tuRepo: Repository<TenantUser>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(TenantUserRole) private readonly turRepo: Repository<TenantUserRole>,
    @InjectRepository(RolePermission) private readonly rpermRepo: Repository<RolePermission>,
  ) {}

  async run() {
    const tenantName = process.env.SEED_TENANT_NAME ?? 'Demo Cooperative';
    const tenantSlug = process.env.SEED_TENANT_SLUG ?? 'demo-coop';
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.local';
    const adminName = process.env.SEED_ADMIN_NAME ?? 'Demo Admin';
    const adminLname = process.env.SEED_ADMIN_LASTNAME ?? 'Demo Admin';
    const adminMobile = process.env.SEED_ADMIN_MOBILE ?? '+26612345678';
    const adminPass = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

    // 1) Tenant
    /**
     * Handled in dedicated seed file
     */
    const tenant = await this.tenantRepo.findOne({where: {slug: tenantSlug}})
    const adminRole = await this.roleRepo.findOne({where: {code: 'tenant_admin'}})
    

    
    /* 2) Permissions
    /**
     * Handled in dedicated seed file
     */

    // 3) Roles
    /**
     * Handled in dedicated seed file
     */

    // 4) Role permissions (ADMIN gets all)
    /**
     * Handled in dedicated seed file
     */

    
    // 5) Admin user
    let admin = await this.userRepo.findOne({ where: { email: adminEmail } });
    if (!admin) {
      admin = await this.userRepo.save({
        email: adminEmail,
        firstName: adminName,
        lastName: adminLname,
        mobile: adminMobile,
        passwordHash: await hashPassword(adminPass),
        isActive: true,
      });
    }

    // 6) Tenant membership link
    let tenantUser = await this.tuRepo.findOne({ where: { tenantId: tenant?.id, userId: admin.id } });
    if (!tenantUser) {
      tenantUser = await this.tuRepo.save({
        tenantId: tenant?.id,
        userId: admin.id,
        isActive: true,
      });
    }

    // 7) Assign ADMIN role within this tenant
    const existingTur = await this.turRepo.findOne({
      where: { tenantUserId: tenantUser.id, roleId: adminRole?.id },
    });
    if (!existingTur) {
      await this.turRepo.save({
        tenantUserId: tenantUser.id,
        roleId: adminRole?.id,
      });
    }

    this.logger.log(`✅ Seed complete for tenant: ${tenant?.slug}`);
  }
}
