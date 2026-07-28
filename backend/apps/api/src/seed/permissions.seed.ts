import { DataSource } from "typeorm";
import { Permission } from "../modules/identity/entities/permission.entity";

/**
 * Define permissions in a structured, grouped way.
 * This keeps things readable and easy to maintain.
 */
const PERMISSIONS: Array<{
  resource: string;
  actions: Array<{ action: string; description: string }>;
}> = [
  // =========================
  // SYSTEM
  // =========================
  {
    resource: "system",
    actions: [
      { action: "admin", description: "Full system administrative access" },
      { action: "dashboard.read", description: "View system dashboard" },
      { action: "settings.read", description: "View system settings" },
      { action: "settings.update", description: "Update system settings" },
    ],
  },

  // =========================
  // USERS
  // =========================
  {
    resource: "user",
    actions: [
      { action: "create", description: "Create users" },
      { action: "read", description: "View own user details" },
      { action: "read.all", description: "View all users" },
      { action: "update", description: "Update user details" },
      { action: "deactivate", description: "Deactivate users" },
      { action: "activate", description: "Activate users" },
      { action: "reset-password", description: "Reset user password" },
      { action: "invite", description: "Invite users" },
      { action: "create_temp_password", description: "Create temporary passwords on behalf of users" },
      { action: "assign-role", description: "Assign roles to users" },
    ],
  },

  // =========================
  // ROLES
  // =========================
  {
    resource: "role",
    actions: [
      { action: "create", description: "Create roles" },
      { action: "read", description: "View roles" },
      { action: "read.all", description: "View all roles" },
      { action: "update", description: "Update roles" },
      { action: "delete", description: "Delete roles" },
      { action: "assign-permission", description: "Assign permissions to roles" },
    ],
  },

  // =========================
  // AUDIT
  // =========================
  {
    resource: "audit",
    actions: [
      { action: "read", description: "View audit logs" },
      { action: "read.all", description: "View all audit logs" },
      { action: "export", description: "Export audit logs" },
    ],
  },

  // =========================
  // COOP YEAR
  // =========================
  {
    resource: "year",
    actions: [
      { action: "create", description: "Create cooperative year" },
      { action: "read", description: "View cooperative year" },
      { action: "read.all", description: "View all cooperative years" },
      { action: "open", description: "Open cooperative year" },
      { action: "finalize-roster", description: "Finalize member roster" },
      { action: "close", description: "Close cooperative year" },
    ],
  },

  // =========================
  // MEMBERS
  // =========================
  {
    resource: "member",
    actions: [
      { action: "create", description: "Create members" },
      { action: "read", description: "View own member record" },
      { action: "read.all", description: "View all members" },
      { action: "update", description: "Update member details" },
      { action: "deactivate", description: "Deactivate member" },
      { action: "activate", description: "Activate member" },
    ],
  },

  // =========================
  // YEAR MEMBERSHIP
  // =========================
  {
    resource: "year_member",
    actions: [
      { action: "add", description: "Add member to year" },
      { action: "read", description: "View year membership" },
      { action: "read.all", description: "View all year memberships" },
      { action: "update", description: "Update year membership" },
      { action: "remove", description: "Remove member from year" },
    ],
  },

  // =========================
  // TENANT SCHEME
  // =========================
  {
    resource: "scheme",
    actions: [
      { action: "create", description: "create scheem for current tenant" },
      { action: "read", description: "View all schemes for current tenat" },
      { action: "update", description: "Update tenant scheme" },
      { action: "activate", description: "activate tenant scheme" },
      { action: "suspend", description: "suspend tenant scheme" },
      { action: "archive", description: "archive tenant scheme" },
      { action: "role.read", description: "archive tenant scheme" },
      { action: "role.assign", description: "archive tenant scheme" },
    ],
  },

  // =========================
  // SCHEME CYCLES
  // =========================
  {
    resource: "cycle",
    actions: [
      { action: "create", description: "create cycle current scheme" },
      { action: "read", description: "view cycle for this scheme" },
      { action: "update", description: "Update scheme cyle" },
      { action: "open", description: "open scheme cycle" },
      { action: "pause", description: "pause scheme cycle" },
      { action: "close", description: "close scheme cycle" },
      { action: "cancel", description: "cancel scheme cycle" },
    ],
  },

  // =========================
  // CYCLE PARTICIPANTS
  // =========================
  {
    resource: "cycle_participant",
    actions: [
      { action: "add", description: "add cycle Participant" },
      { action: "read", description: "view cycle participants" },
      { action: "update", description: "Update scheme cyle participant" },
      { action: "suspend", description: "suspend cycle participant" },
      { action: "reactivate", description: "reactivate cycle participant" },
      { action: "exit", description: "exit current cycle" },
      { action: "remove", description: "remove current participant from cycle" },
    ],
  },

  // =========================
  // CONTRIBUTIONS
  // =========================
  {
    resource: "contribution",
    actions: [
      { action: "create", description: "add meaningful description" },
      { action: "read", description: "add meaningful description" },
      { action: "read.all", description: "add meaningful description" },
      { action: "record-payment", description: "add meaningful description" },
      { action: "reverse", description: "add meaningful description" },
    ],
  },

  // =========================
  // SUBSCRIPTIONS
  // =========================
  {
    resource: "subscription",
    actions: [
      { action: "create", description: "Create subscription" },
      { action: "read", description: "View own subscriptions" },
      { action: "read.all", description: "View all subscriptions" },
      { action: "record-payment", description: "Record subscription payment" },
      { action: "reverse", description: "Reverse subscription transaction" },
    ],
  },

  // =========================
  // SPECIAL CONTRIBUTIONS
  // =========================
  {
    resource: "special_contribution",
    actions: [
      { action: "create", description: "Create special contribution" },
      { action: "read", description: "View special contributions" },
      { action: "read.all", description: "View all special contributions" },
      { action: "record-payment", description: "Record special contribution payment" },
      { action: "reverse", description: "Reverse special contribution transaction" },
    ],
  },

  // =========================
  // LEDGER
  // =========================
  {
    resource: "ledger",
    actions: [
      { action: "read", description: "View own ledger entries" },
      { action: "read.all", description: "View all ledger entries" },
      { action: "export", description: "Export ledger data" },
    ],
  },

  // =========================
  // ACCOUNT
  // =========================
  {
    resource: "account",
    actions: [
      { action: "read", description: "View configured accounts" },
      { action: "create", description: "create new account" },
      { action: "update", description: "update account details" },
      { action: "deactivate", description: "deactivate account" },
      { action: "archive", description: "Archive accounts" },
    ],
  },

  // =========================
  // ACCOUNTING SETTINGS
  // =========================
  {
    resource: "accounting_settings",
    actions: [
      { action: "read", description: "View accpunting settings entries" },
      { action: "update", description: "Update Accounting Settings" },
    ],
  },

  // =========================
  // ACCOUNTING PERIOD
  // =========================
  {
    resource: "accounting_period",
    actions: [
      { action: "read", description: "View accpunting settings entries" },
      { action: "create", description: "Update Accounting Settings" },
      { action: "close", description: "Update Accounting Settings" },
    ],
  },

  // =========================
  // TRIAL BALANCE REPORTING
  // =========================
  {
    resource: "report:trial_balance",
    actions: [
      { action: "read", description: "View accpunting settings entries" },
    ],
  },

  // =========================
  // ACCOUNTING LEDGER REPORTING
  // =========================
  {
    resource: "report:account_ledger",
    actions: [
      { action: "read", description: "View accpunting settings entries" },
    ],
  },

  // =========================
  // ACCOUNTING SUMMARY REPORTING
  // =========================
  {
    resource: "report:accounting_summary",
    actions: [
      { action: "read", description: "View accpunting settings entries" },
    ],
  },

  // =========================
  // Journal
  // =========================
  {
    resource: "journal_entry",
    actions: [
      { action: "post_manual", description: "Manually post journal entries" },
      { action: "read", description: "View journal entries" },
      { action: "reverse", description: "posted journal entries are corrected through proper accounting reversals, not mutation" },
    ],
  },

  // =========================
  // Savings Statement
  // =========================
  {
    resource: "savings_statement",
    actions: [
      { action: "read", description: "Manually post journal entries" },
    ],
  },

  // =========================
  // Savings Summary
  // =========================
  {
    resource: "savings_summary",
    actions: [
      { action: "read", description: "Manually post journal entries" },
    ],
  },



  // =========================
  // LOANS
  // =========================
  {
    resource: "loan",
    actions: [
      { action: "create", description: "Create loan request" },
      { action: "request", description: "Create loan request" },
      { action: "pledge", description: "Create loan request" },
      { action: "read", description: "View own loans" },
      { action: "read.all", description: "View all loans" },
      { action: "issue", description: "Issue loan" },
      { action: "approve", description: "Approve loan" },
      { action: "reject", description: "Reject loan" },
      { action: "repay", description: "Record loan repayment" },
    ],
  },

  // =========================
  // LOAN POLICY
  // =========================
  {
    resource: "laon-policy",
    actions: [
      { action: "manage", description: "Manage loan policy" },
      { action: "read", description: "View loan policy" },
    ],
  },

  // =========================
  // APPROVAL POLICY
  // =========================
  {
    resource: "approval-policy",
    actions: [
      { action: "manage", description: "Manage approval policy" },
      { action: "read", description: "View approval policy" },
    ],
  },

  // =========================
  // OUTBOUND REQUEST
  // =========================
  {
    resource: "outbound-request",
    actions: [
      { action: "read", description: "View outbount requests" },
      { action: "initiate", description: "Trigger an outbound funds reqeuest" },
      { action: "approve", description: "Approve an outbound funds reqeuest" },
    ],
  },


  // =========================
  // FUNDING REQUESTS
  // =========================
  {
    resource: "funding_request",
    actions: [
      { action: "create", description: "Create funding request" },
      { action: "read", description: "View funding requests" },
      { action: "read.all", description: "View all funding requests" },
      { action: "fulfill", description: "Fulfill funding request" },
    ],
  },

  // =========================
  // FUNDING COMMITMENTS
  // =========================
  {
    resource: "funding_commitment",
    actions: [
      { action: "create", description: "Commit funds to request" },
      { action: "read", description: "View commitments" },
      { action: "read.all", description: "View all commitments" },
    ],
  },

  // =========================
  // PAYOUTS
  // =========================
  {
    resource: "payout",
    actions: [
      { action: "read", description: "View payouts" },
      { action: "read.all", description: "View all payouts" },
      { action: "calculate", description: "Calculate payouts" },
      { action: "execute", description: "Execute payouts" },
    ],
  },

  // =========================
  // REPORTS
  // =========================
  {
    resource: "report",
    actions: [
      { action: "read", description: "View reports" },
      { action: "export", description: "Export reports" },
    ],
  },
];

/**
 * Seed function
 */
export async function seedPermissions(dataSource: DataSource) {
  const repo = dataSource.getRepository(Permission);

  let created = 0;

  for (const group of PERMISSIONS) {
    for (const actionDef of group.actions) {
      const resource = group.resource;
      const action = actionDef.action;

      // Code is generated by entity hook, but we compute it here for lookup
      const code = `${resource}:${action}`;

      const existing = await repo.findOne({ where: { code } });

      if (!existing) {
        const permission = repo.create({
          resource,
          action,
          description: actionDef.description,
        });

        await repo.save(permission);
        created++;
      }
    }
  }

  console.log(`✅ Permissions seeded. Created: ${created}`);
}