import { DataSource, In } from 'typeorm';
import { Role } from '../modules/identity/entities/role.entity';
import { Permission } from '../modules/identity/entities/permission.entity';
import { RolePermission } from '../modules/identity/entities/role-permission.entity';

/**
 * Role -> permission code mapping.
 *
 * Permission codes must match your Permission entity's generated format:
 *   resource:action
 *
 * Example:
 *   year:read
 *   loan:request
 *   funding_request:fulfill
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  tenant_admin: [
    // System
    'system:admin',
    'system:dashboard.read',
    'system:settings.read',
    'system:settings.update',

    // Users / roles / audit
    'user:create',
    'user:read',
    'user:read.all',
    'user:update',
    'user:deactivate',
    'user:activate',
    'user:reset-password',
    'user:assign-role',
    'create_temp_password',
    'invite',

    'role:create',
    'role:read',
    'role:read.all',
    'role:update',
    'role:delete',
    'role:assign-permission',

    'audit:read',
    'audit:read.all',
    'audit:export',

    // Years
    'year:create',
    'year:read',
    'year:read.all',
    'year:open',
    'year:finalize-roster',
    'year:close',

    // Members / roster
    'member:create',
    'member:read',
    'member:read.all',
    'member:update',
    'member:deactivate',
    'member:activate',

    'year_member:add',
    'year_member:read',
    'year_member:read.all',
    'year_member:update',
    'year_member:remove',

    //Scheme
    "scheme:create",
    "scheme:read",
    "scheme:update",
    "scheme:activate",
    "scheme:suspend",
    "scheme:archive",

    //Cycles
    "cycle:create",
    "cycle:read",
    "cycle:update",
    "cycle:open",
    "cycle:pause",
    "cycle:close",
    "cycle:cancel",

    //Cycle Participants
    "cycle_participant:create",
    "cycle_participant:read",
    "cycle_participant:update",
    "cycle_participant:suspend",
    "cycle_participant:reactivate",
    "cycle_participant:exit",
    "cycle_participant:remove",

    // Scheme governance roles
    'scheme-role:read',
    'scheme-role:assign',

    // Approval policy
    'approval-policy:read',
    'approval-policy:manage',

    // Outbound requests (the 2-approver withdrawal engine)
    'outbound-request:read',
    'outbound-request:initiate',
    'outbound-request:approve',

    // Loan policy
    'loan-policy:read',
    'loan-policy:manage',

    // Contributions
    'subscription:create',
    'subscription:read',
    'subscription:read.all',
    'subscription:record-payment',
    'subscription:reverse',

    'special_contribution:create',
    'special_contribution:read',
    'special_contribution:read.all',
    'special_contribution:record-payment',
    'special_contribution:reverse',

    // Ledger
    'ledger:read',
    'ledger:read.all',
    'ledger:export',

    // Account
    'account:create',
    'account:read',
    'account:update',
    'account:deactivate',
    'account:archive',

    // Accounting Settings
    'accounting_settings:read',
    'accounting_settings:update',

    //Accounting Periods
    'accounting_period:create',
    'accounting_period:read',
    'accounting_period:close',

    // Journal Entry
    'journal_entry:post_manual',
    'journal_entry:read',
    "journal_entry:reverse",
    
    // Contribution
    'contribution:create',
    'contribution:read',
    'contribution:reverse',

    // Loans
    'loan:request',
    'loan:read',
    'loan:pledge',
    'loan:disburse',
    'loan:record-repayment',
    'loan:escalate-rate',

    // Reports
    "savings_statement:read",
    "savings_summary:read",
    "report:trial_balance:read",
    "report:account_ledger:read",
    "report:accounting_summary:read",
  ],

  treasurer: [
    'system:dashboard.read',

    'audit:read',

    'year:read',
    'year:read.all',

    'member:read',
    'member:read.all',

    'year_member:read',
    'year_member:read.all',

    'subscription:create',
    'subscription:read',
    'subscription:read.all',
    'subscription:record-payment',
    'subscription:reverse',

    'special_contribution:create',
    'special_contribution:read',
    'special_contribution:read.all',
    'special_contribution:record-payment',
    'special_contribution:reverse',

    'ledger:read',
    'ledger:read.all',
    'ledger:export',

    'journal_entry:read',
    'journal_entry:post_manual',
    "journal_entry:reverse",

    // Accounting Settings
    'accounting_settings:read',
    'accounting_settings:update',

    //Accounting Periods
    'accounting_period:create',
    'accounting_period:read',
    'accounting_period:close',

    // Contribution
    'contribution:create',
    'contribution:read',
    'contribution:reverse',

    // Loans
    'loan:request',
    'loan:read',
    'loan:pledge',
    'loan:disburse',
    'loan:record-repayment',
    'loan:escalate-rate',

    // Scheme governance — treasurer is a natural approver
    'scheme-role:read',
    'outbound-request:read',
    'outbound-request:initiate',
    'outbound-request:approve',
    'loan-policy:read',
    'approval-policy:read',

    "report:trial_balance:read",
    "report:account_ledger:read",

    "savings_statement:read",
    "savings_summary:read",
    "report:accounting_summary:read"
  ],

  secretary: [
    'system:dashboard.read',

    'year:read',
    'year:read.all',

    'member:create',
    'member:read',
    'member:read.all',
    'member:update',

    'year_member:add',
    'year_member:read',
    'year_member:read.all',
    'year_member:update',
    'year_member:remove',

    'journal_entry:read',

    'accounting_settings:read',

    // Scheme governance — read visibility only
    'scheme-role:read',
    'outbound-request:read',

    // Contribution
    'contribution:create',
    'contribution:read',

    'funding_request:read',
    'funding_request:read.all',

    'funding_commitment:read',
    'funding_commitment:read.all',

    'report:read',
    "savings_statement:read",
    "savings_summary:read",
    "report:accounting_summary:read"
  ],

  member: [
    // System
    'system:dashboard.read',
    'system:settings.read',

    // Users / roles / audit
    'user:read',
    'user:read.all',

    'role:read',
    'role:read.all',

    'audit:read',
    'audit:read.all',
    'audit:export',

    // Years
    'year:read',
    'year:read.all',

    // Members / roster
    'member:read',
    'member:read.all',
    'year_member:read',
    'year_member:read.all',

    //Scheme
    "scheme:read",

    //Cycles
    "cycle:read",

    //Cycle Participants
    "cycle_participant:read",
    "cycle_participant:exit",

    // Approval policy
    'approval-policy:read',

    // Outbound requests (the 2-approver withdrawal engine)
    'outbound-request:read',
    'outbound-request:initiate',

    // Loan policy
    'loan-policy:read',

    // Subscriptions
    'subscription:create',
    'subscription:read',
    'subscription:read.all',
    'subscription:record-payment',
    'subscription:reverse',

    'special_contribution:create',
    'special_contribution:read',
    'special_contribution:read.all',
    'special_contribution:record-payment',
    'special_contribution:reverse',

    // Ledger
    'ledger:read',
    'ledger:read.all',
    'ledger:export',

    // Account
    'account:read',

    // Accounting Settings
    'accounting_settings:read',

     //Accounting Periods
    'accounting_period:read',
    
    // Journal Entry
    'journal_entry:read',

    // Contribution
    'contribution:create',
    'contribution:read',

    // Loans
    'loan:request',
    'loan:read',
    'loan:pledge',
    
    // Reports
    "savings_statement:read",
    "savings_summary:read",
    "report:trial_balance:read",
    "report:account_ledger:read",
    "report:accounting_summary:read",
  ],
};

/**
 * Seeds role-permission mappings for every tenant role.
 *
 * Idempotent:
 * - Safe to rerun
 * - Will only add missing role_permission rows
 */
export async function seedRolePermissions(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);
  const permissionRepo = dataSource.getRepository(Permission);
  const rolePermissionRepo = dataSource.getRepository(RolePermission);

  const roles = await roleRepo.find({
    where: {
      code: In(Object.keys(ROLE_PERMISSION_MAP)),
    },
  });

  const allPermissionCodes = Array.from(
    new Set(Object.values(ROLE_PERMISSION_MAP).flat()),
  );

  const permissions = await permissionRepo.find({
    where: {
      code: In(allPermissionCodes),
    },
  });

  const permissionByCode = new Map(permissions.map((p) => [p.code, p]));

  let created = 0;

  for (const role of roles) {
    const wantedCodes = ROLE_PERMISSION_MAP[role.code] ?? [];

    for (const code of wantedCodes) {
      const permission = permissionByCode.get(code);

      if (!permission) {
        console.warn(
          `⚠️ Permission not found for role assignment: ${code} (role=${role.code}, tenant=${role.tenantId})`,
        );
        continue;
      }

      const existing = await rolePermissionRepo.findOne({
        where: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      if (existing) continue;

      const rolePermission = rolePermissionRepo.create({
        roleId: role.id,
        permissionId: permission.id,
      });

      await rolePermissionRepo.save(rolePermission);
      created++;
    }
  }

  console.log(`✅ Role permissions seeded. Created: ${created}`);
}