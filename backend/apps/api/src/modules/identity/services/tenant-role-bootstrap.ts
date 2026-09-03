import { EntityManager, In } from "typeorm";
import { Role } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";
import { RolePermission } from "../entities/role-permission.entity";

/**
 * Single source of truth for "what does every tenant get by default" —
 * extracted from the seed script (roles.seed.ts / role-permissions.seed.ts),
 * which previously defined this only as a standalone script that looped
 * over every existing tenant. That script is now a thin wrapper around
 * this function; self-service tenant creation (via Setup) calls the exact
 * same logic for just the one new tenant. One definition, two callers,
 * instead of the role/permission map risking drifting into two copies.
 */

export const DEFAULT_TENANT_ROLES: Array<{
  name: string;
  code: string;
  description: string;
}> = [
  {
    name: "Tenant Administrator",
    code: "tenant_admin",
    description: "Full administrative access within the tenant.",
  },
  {
    name: "Treasurer",
    code: "treasurer",
    description: "Manages financial operations, loans, repayments, and payouts.",
  },
  {
    name: "Secretary",
    code: "secretary",
    description: "Manages members, roster administration, and operational records.",
  },
  {
    name: "Member",
    code: "member",
    description: "Standard cooperative member with self-service access.",
  },
];

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  tenant_admin: [
    "system:admin",
    "system:dashboard.read",
    "system:settings.read",
    "system:settings.update",
    "user:create",
    "user:read",
    "user:read.all",
    "user:update",
    "user:deactivate",
    "user:activate",
    "user:reset-password",
    "user:assign-role",
    "create_temp_password",
    "invite",
    "role:create",
    "role:read",
    "role:read.all",
    "role:update",
    "role:delete",
    "role:assign-permission",
    "audit:read",
    "audit:read.all",
    "audit:export",
    "year:create",
    "year:read",
    "year:read.all",
    "year:open",
    "year:finalize-roster",
    "year:close",
    "member:create",
    "member:read",
    "member:read.all",
    "member:update",
    "member:deactivate",
    "member:activate",
    "year_member:add",
    "year_member:read",
    "year_member:read.all",
    "year_member:update",
    "year_member:remove",
    "scheme:create",
    "scheme:read",
    "scheme:update",
    "scheme:activate",
    "scheme:suspend",
    "scheme:archive",
    "cycle:create",
    "cycle:read",
    "cycle:update",
    "cycle:open",
    "cycle:pause",
    "cycle:close",
    "cycle:cancel",
    "cycle_participant:create",
    "cycle_participant:read",
    "cycle_participant:update",
    "cycle_participant:suspend",
    "cycle_participant:reactivate",
    "cycle_participant:exit",
    "cycle_participant:remove",
    "scheme-role:read",
    "scheme-role:assign",
    "approval-policy:read",
    "approval-policy:manage",
    "outbound-request:read",
    "outbound-request:initiate",
    "outbound-request:approve",
    "loan-policy:read",
    "loan-policy:manage",
    "payment:record",
    "payment:allocate",
    "subscription:create",
    "subscription:read",
    "subscription:read.all",
    "subscription:record-payment",
    "subscription:reverse",
    "special_contribution:create",
    "special_contribution:read",
    "special_contribution:read.all",
    "special_contribution:record-payment",
    "special_contribution:reverse",
    "ledger:read",
    "ledger:read.all",
    "ledger:export",
    "account:create",
    "account:read",
    "account:update",
    "account:deactivate",
    "account:archive",
    "accounting_settings:read",
    "accounting_settings:update",
    "accounting_period:create",
    "accounting_period:read",
    "accounting_period:close",
    "journal_entry:post_manual",
    "journal_entry:read",
    "journal_entry:reverse",
    "contribution:create",
    "contribution:read",
    "contribution:reverse",
    "loan:request",
    "loan:read",
    "loan:pledge",
    "loan:disburse",
    "loan:record-repayment",
    "loan:escalate-rate",
    "savings_statement:read",
    "savings_summary:read",
    "report:trial_balance:read",
    "report:account_ledger:read",
    "report:accounting_summary:read",
  ],

  treasurer: [
    "system:dashboard.read",
    "system:settings.read",
    "user:create",
    "user:read",
    "user:read.all",
    "user:update",
    "user:deactivate",
    "user:activate",
    "user:assign-role",
    "create_temp_password",
    "invite",
    "role:read",
    "role:read.all",
    "role:assign-permission",
    "audit:read",
    "audit:read.all",
    "audit:export",
    "year:read",
    "year:read.all",
    "member:read",
    "member:read.all",
    "year:create",
    "year:open",
    "year:finalize-roster",
    "year:close",
    "year_member:add",
    "year_member:read",
    "year_member:read.all",
    "year_member:update",
    "year_member:remove",
    "scheme:create",
    "scheme:read",
    "scheme:update",
    "scheme:activate",
    "scheme:suspend",
    "scheme:archive",
    "cycle:create",
    "cycle:read",
    "cycle:update",
    "cycle:open",
    "cycle:pause",
    "cycle:close",
    "cycle:cancel",
    "cycle_participant:create",
    "cycle_participant:read",
    "cycle_participant:update",
    "cycle_participant:suspend",
    "cycle_participant:reactivate",
    "cycle_participant:exit",
    "cycle_participant:remove",
    "scheme-role:read",
    "scheme-role:assign",
    "approval-policy:read",
    "approval-policy:manage",
    "outbound-request:read",
    "outbound-request:initiate",
    "outbound-request:approve",
    "loan-policy:read",
    "loan-policy:manage",
    "payment:record",
    "payment:allocate",
    "subscription:create",
    "subscription:read",
    "subscription:read.all",
    "subscription:record-payment",
    "subscription:reverse",
    "special_contribution:create",
    "special_contribution:read",
    "special_contribution:read.all",
    "special_contribution:record-payment",
    "special_contribution:reverse",
    "ledger:read",
    "ledger:read.all",
    "ledger:export",
    "account:create",
    "account:read",
    "account:update",
    "account:deactivate",
    "account:archive",
    "journal_entry:read",
    "journal_entry:post_manual",
    "journal_entry:reverse",
    "accounting_settings:read",
    "accounting_settings:update",
    "accounting_period:create",
    "accounting_period:read",
    "accounting_period:close",
    "contribution:create",
    "contribution:read",
    "contribution:reverse",
    "loan:request",
    "loan:read",
    "loan:pledge",
    "loan:disburse",
    "loan:record-repayment",
    "loan:escalate-rate",
    "savings_statement:read",
    "savings_summary:read",
    "report:trial_balance:read",
    "report:account_ledger:read",
    "report:accounting_summary:read",
  ],

  secretary: [
    "system:dashboard.read",
    "year:read",
    "year:read.all",
    "member:create",
    "member:read",
    "member:read.all",
    "member:update",
    "year_member:add",
    "year_member:read",
    "year_member:read.all",
    "year_member:update",
    "year_member:remove",
    "journal_entry:read",
    "accounting_settings:read",
    "scheme-role:read",
    "outbound-request:read",
    "contribution:create",
    "contribution:read",
    "funding_request:read",
    "funding_request:read.all",
    "funding_commitment:read",
    "funding_commitment:read.all",
    "report:read",
    "savings_statement:read",
    "savings_summary:read",
    "report:accounting_summary:read",
  ],

  member: [
    "system:dashboard.read",
    "system:settings.read",
    "user:read",
    "user:read.all",
    "role:read",
    "role:read.all",
    "audit:read",
    "audit:read.all",
    "audit:export",
    "year:read",
    "year:read.all",
    "member:read",
    "member:read.all",
    "year_member:read",
    "year_member:read.all",
    "scheme:read",
    "cycle:read",
    "cycle_participant:read",
    "cycle_participant:exit",
    "approval-policy:read",
    "outbound-request:read",
    "outbound-request:initiate",
    "loan-policy:read",
    "payment:allocate",
    "subscription:create",
    "subscription:read",
    "subscription:read.all",
    "subscription:record-payment",
    "subscription:reverse",
    "special_contribution:create",
    "special_contribution:read",
    "special_contribution:read.all",
    "special_contribution:record-payment",
    "special_contribution:reverse",
    "ledger:read",
    "ledger:read.all",
    "ledger:export",
    "account:read",
    "accounting_settings:read",
    "accounting_period:read",
    "journal_entry:read",
    "contribution:create",
    "contribution:read",
    "loan:request",
    "loan:read",
    "loan:pledge",
    "loan:record-repayment",
    "savings_statement:read",
    "savings_summary:read",
    "report:trial_balance:read",
    "report:account_ledger:read",
    "report:accounting_summary:read",
  ],
};

/**
 * Creates the four standard roles for ONE tenant and grants each its
 * permission set. Idempotent — safe to call on a tenant that already has
 * some or all of these, will only create what's missing.
 */
export async function bootstrapRolesForTenant(
  manager: EntityManager,
  tenantId: string,
): Promise<void> {
  const roleRepo = manager.getRepository(Role);
  const permissionRepo = manager.getRepository(Permission);
  const rolePermissionRepo = manager.getRepository(RolePermission);

  const roleByCode = new Map<string, Role>();

  for (const roleDef of DEFAULT_TENANT_ROLES) {
    let role = await roleRepo.findOne({
      where: { tenantId, code: roleDef.code },
    });

    if (!role) {
      role = roleRepo.create({
        tenantId,
        name: roleDef.name,
        code: roleDef.code,
        description: roleDef.description,
        isActive: true,
      });
      role = await roleRepo.save(role);
    }

    roleByCode.set(roleDef.code, role);
  }

  const allPermissionCodes = Array.from(
    new Set(Object.values(ROLE_PERMISSION_MAP).flat()),
  );

  const permissions = await permissionRepo.find({
    where: { code: In(allPermissionCodes) },
  });
  const permissionByCode = new Map(permissions.map((p) => [p.code, p]));

  for (const [roleCode, wantedCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = roleByCode.get(roleCode);
    if (!role) continue;

    for (const code of wantedCodes) {
      const permission = permissionByCode.get(code);
      if (!permission) continue;

      const existing = await rolePermissionRepo.findOne({
        where: { roleId: role.id, permissionId: permission.id },
      });
      if (existing) continue;

      const rolePermission = rolePermissionRepo.create({
        roleId: role.id,
        permissionId: permission.id,
      });
      await rolePermissionRepo.save(rolePermission);
    }
  }
}
