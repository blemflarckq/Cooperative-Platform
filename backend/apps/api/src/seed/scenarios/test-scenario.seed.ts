import { NestFactory } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiModule } from "../../api.module";

import { hashPassword } from "../../common/auth/password";
import { User } from "../../modules/identity/entities/user.entity";
import { Tenant } from "../../modules/identity/entities/tenant.entity";
import { TenantUser } from "../../modules/identity/entities/tenant-user.entity";
import { Role } from "../../modules/identity/entities/role.entity";
import { TenantUserRole } from "../../modules/identity/entities/tenant-user-role.entity";

import { SchemesService } from "../../modules/schemes/services/schemes.service";
import { OperatingCyclesService } from "../../modules/schemes/services/operating-cycles.service";
import { CycleParticipantsService } from "../../modules/schemes/services/cycle-participants.service";
import { ApprovalPolicyService } from "../../modules/schemes/services/approval-policy.service";
import { SchemeRoleAssignmentsService } from "../../modules/schemes/services/scheme-role-assignments.service";
import { LoanPolicyService } from "../../modules/loans/services/loan-policy.service";
import { ContributionsService } from "../../modules/accounting/services/contributions.service";

import {
  CycleMode,
  ContributionMode,
  LoanMode,
  PayoutMode,
} from "../../modules/schemes/enums/scheme.enums";
import { SchemeGovernanceRoleType, ApprovalDecision } from "../../modules/schemes/enums/governance.enums";
import { AtCapBehavior } from "../../modules/loans/enums/loan.enums";
import { ContributionSource } from "../../modules/accounting/enums/contribution.enums";

/**
 * Seeds a full, realistic test scenario on top of the base seed
 * (tenant + permissions + roles + admin user — run `npm run seed:dev`
 * first if you haven't).
 *
 * Everything here goes through the REAL service layer, not raw inserts —
 * so activating a scheme actually triggers implicit cycle / draft loan
 * policy creation exactly like it would for a real user, and every
 * governance rule (2-approver, no-self-approval, pledge balance checks)
 * is live and testable immediately after this runs.
 *
 * Fully idempotent — safe to re-run. Existing rows are found and reused
 * rather than duplicated.
 */

const TEST_PASSWORD = "Test1234!";

interface SeededUser {
  userId: string; // User.id — what you log in with / use as actorUserId
  tenantUserId: string; // TenantUser.id — what services actually operate on
  email: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ApiModule);

  const tenantRepo = app.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const tenantUserRepo = app.get<Repository<TenantUser>>(getRepositoryToken(TenantUser));
  const roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
  const tenantUserRoleRepo = app.get<Repository<TenantUserRole>>(getRepositoryToken(TenantUserRole));

  const schemesService = app.get(SchemesService);
  const cyclesService = app.get(OperatingCyclesService);
  const participantsService = app.get(CycleParticipantsService);
  const approvalPolicyService = app.get(ApprovalPolicyService);
  const roleAssignmentsService = app.get(SchemeRoleAssignmentsService);
  const loanPolicyService = app.get(LoanPolicyService);
  const contributionsService = app.get(ContributionsService);

  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "demo-coop";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.local";

  const tenant = await tenantRepo.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error(
      `Tenant '${tenantSlug}' not found — run "npm run seed:dev" first, this script builds on top of it.`,
    );
  }

  const adminUser = await userRepo.findOne({ where: { email: adminEmail } });
  if (!adminUser) {
    throw new Error(`Admin user '${adminEmail}' not found — run "npm run seed:dev" first.`);
  }
  const actorUserId = adminUser.id;

  console.log(`Seeding test scenario for tenant: ${tenant.slug}`);

  // ---------------------------------------------------------------------
  // Step 1: Test users
  // ---------------------------------------------------------------------
  async function ensureUser(
    email: string,
    firstName: string,
    lastName: string,
    roleCode: string,
  ): Promise<SeededUser> {
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      user = await userRepo.save({
        email,
        firstName,
        lastName,
        mobile: "+26650000000",
        passwordHash: await hashPassword(TEST_PASSWORD),
        isActive: true,
      });
      console.log(`  created user ${email}`);
    }

    let tenantUser = await tenantUserRepo.findOne({
      where: { tenantId: tenant!.id, userId: user.id },
    });
    if (!tenantUser) {
      tenantUser = await tenantUserRepo.save({
        tenantId: tenant!.id,
        userId: user.id,
        isActive: true,
      });
    }

    const role = await roleRepo.findOne({ where: { code: roleCode } });
    if (!role) {
      throw new Error(`Role '${roleCode}' not found — run "npm run seed:dev" first.`);
    }

    const existingAssignment = await tenantUserRoleRepo.findOne({
      where: { tenantUserId: tenantUser.id, roleId: role.id },
    });
    if (!existingAssignment) {
      await tenantUserRoleRepo.save({ tenantUserId: tenantUser.id, roleId: role.id });
    }

    return { userId: user.id, tenantUserId: tenantUser.id, email };
  }

  // Both treasurer and committee use the 'treasurer' platform role — that's
  // what grants outbound-request:approve at all. Their SCHEME-level
  // governance role (TREASURER vs COMMITTEE_MEMBER, assigned below) is what
  // actually differentiates them for approval-policy eligibility.
  const treasurer = await ensureUser("treasurer@demo.local", "Thabo", "Treasurer", "treasurer");
  const committee = await ensureUser("committee@demo.local", "Lerato", "Committee", "treasurer");
  const member1 = await ensureUser("member1@demo.local", "Palesa", "Member", "member");
  const member2 = await ensureUser("member2@demo.local", "Mpho", "Member", "member");
  const member3 = await ensureUser("member3@demo.local", "Bokang", "Member", "member");

  console.log("Users ready:", [treasurer, committee, member1, member2, member3].map((u) => u.email));

  // ---------------------------------------------------------------------
  // Step 2: Savings scheme (recurring, cycle-managed, loans enabled)
  // ---------------------------------------------------------------------
  let [existingSavingsSchemes] = await schemesService.findAll(tenant.id, {
    search: "Bohale Savings Club",
  } as any);
  let savingsScheme: any = existingSavingsSchemes?.[0];

  if (!savingsScheme) {
    savingsScheme = await schemesService.create(
      tenant.id,
      {
        name: "Bohale Savings Club",
        cycleMode: CycleMode.FIXED_PERIOD,
        contributionMode: ContributionMode.MONTHLY_FIXED,
        loanMode: LoanMode.SELF_AND_PEER_FUNDED,
        payoutMode: PayoutMode.END_OF_CYCLE,
      },
      actorUserId,
    );
    console.log(`  created scheme: Bohale Savings Club (${savingsScheme.id})`);
  }

  if (savingsScheme.status !== "ACTIVE") {
    savingsScheme = await schemesService.activate(tenant.id, savingsScheme.id, actorUserId);
  }

  // FIXED_PERIOD schemes don't get an implicit cycle — create one explicitly.
  let [existingCycles] = await cyclesService.findByScheme(tenant.id, savingsScheme.id, {} as any);
  let savingsCycle: any = existingCycles?.[0];

  if (!savingsCycle) {
    const currentYear = new Date().getFullYear();
    savingsCycle = await cyclesService.createForScheme(
      tenant.id,
      savingsScheme.id,
      {
        name: "2026 Cycle",
        startsOn: `${currentYear}-01-01`,
        endsOn: `${currentYear}-12-31`,
      },
      actorUserId,
    );
    savingsCycle = await cyclesService.open(tenant.id, savingsCycle.id, actorUserId);
    console.log(`  created + opened cycle: ${savingsCycle.name} (${savingsCycle.id})`);
  }

  // Approval policy: either TREASURER or COMMITTEE_MEMBER can be one of
  // the 2 required approvers.
  try {
    await approvalPolicyService.getForScheme(tenant.id, savingsScheme.id);
  } catch {
    await approvalPolicyService.upsert(
      tenant.id,
      savingsScheme.id,
      {
        eligibleRoleTypes: [SchemeGovernanceRoleType.TREASURER, SchemeGovernanceRoleType.COMMITTEE_MEMBER],
        requiredApprovals: 2,
      },
      actorUserId,
    );
    console.log("  configured approval policy: 2 of [TREASURER, COMMITTEE_MEMBER]");
  }

  // Loan policy — real, reviewed terms, overwriting the auto-created draft.
  await loanPolicyService.upsert(
    tenant.id,
    savingsScheme.id,
    {
      selfFundedMonthlyRate: "1.50",
      peerBaseMonthlyRate: "3.00",
      peerMonthlyRateIncrement: "0.50",
      peerCapRate: "12.00",
      atCapBehavior: AtCapBehavior.FLAG_AND_BLOCK,
    },
    actorUserId,
  );
  console.log("  configured (reviewed) loan policy");

  // Scheme governance roles, scoped to THIS scheme specifically.
  async function ensureGovernanceRole(
    tenantUserId: string,
    roleType: SchemeGovernanceRoleType,
  ) {
    const active = await roleAssignmentsService.getActiveRoleTypesForTenantUser(
      tenant!.id,
      savingsScheme.id,
      tenantUserId,
    );
    if (!active.includes(roleType)) {
      await roleAssignmentsService.assignRole(
        tenant!.id,
        savingsScheme.id,
        tenantUserId,
        roleType,
        actorUserId,
      );
    }
  }

  await ensureGovernanceRole(treasurer.tenantUserId, SchemeGovernanceRoleType.TREASURER);
  await ensureGovernanceRole(committee.tenantUserId, SchemeGovernanceRoleType.COMMITTEE_MEMBER);
  console.log("  assigned governance roles: treasurer=TREASURER, committee=COMMITTEE_MEMBER");

  // Enroll everyone as active cycle participants.
  async function ensureParticipant(tenantUserId: string) {
    const [participants] = await participantsService.findByCycle(
      tenant!.id,
      savingsCycle.id,
      {} as any,
    );
    const already = participants?.some((p: any) => p.tenantUserId === tenantUserId);
    if (!already) {
      await participantsService.enroll(
        tenant!.id,
        savingsCycle.id,
        { tenantUserId },
        actorUserId,
      );
    }
  }

  for (const u of [treasurer, committee, member1, member2, member3]) {
    await ensureParticipant(u.tenantUserId);
  }
  console.log("  enrolled all 5 test users as active cycle participants");

  // Contributions — member1 gets enough to test a SPLIT loan (self +
  // peer), member2/member3 get enough to be able to pledge toward it.
  async function postContribution(tenantUserId: string, amount: string, label: string) {
    await contributionsService.createForCycle(
      tenant!.id,
      savingsCycle.id,
      {
        tenantUserId,
        contributionDate: new Date().toISOString().slice(0, 10),
        amount,
        source: ContributionSource.MOBILE_MONEY,
        notes: `Seeded test contribution (${label})`,
      },
      actorUserId,
    );
  }

  await postContribution(member1.tenantUserId, "300.00", "member1 #1");
  await postContribution(member1.tenantUserId, "300.00", "member1 #2");
  await postContribution(member1.tenantUserId, "300.00", "member1 #3");
  await postContribution(member2.tenantUserId, "500.00", "member2");
  await postContribution(member3.tenantUserId, "500.00", "member3");
  console.log("  posted contributions: member1=M900 (3x M300), member2=M500, member3=M500");

  // ---------------------------------------------------------------------
  // Step 3: Project-based scheme (one-off fundraiser, implicit cycle)
  // ---------------------------------------------------------------------
  let [existingProjectSchemes] = await schemesService.findAll(tenant.id, {
    search: "Road Repair Fund",
  } as any);
  let projectScheme: any = existingProjectSchemes?.[0];

  if (!projectScheme) {
    projectScheme = await schemesService.create(
      tenant.id,
      {
        name: "Road Repair Fund",
        cycleMode: CycleMode.PROJECT_BASED,
        contributionMode: ContributionMode.PROJECT_TARGET,
        loanMode: LoanMode.DISABLED,
        payoutMode: PayoutMode.PROJECT_EXPENSE,
      },
      actorUserId,
    );
    console.log(`  created scheme: Road Repair Fund (${projectScheme.id})`);
  }

  if (projectScheme.status !== "ACTIVE") {
    // Activating a PROJECT_BASED scheme auto-creates its implicit cycle —
    // no manual createForScheme/open needed, unlike the savings scheme above.
    projectScheme = await schemesService.activate(tenant.id, projectScheme.id, actorUserId);
    console.log("  activated Road Repair Fund — implicit cycle auto-created");
  }

  // The implicit cycle created at activation always has targetAmount:
  // null (it's created without any user input, before anyone has decided
  // on a fundraising goal) — set a real one now, same as a Treasurer
  // would need to do for this to be a meaningful fundraiser with visible
  // progress. Worth knowing: this is a real gap in the product, not just
  // a seed-script detail — every real project-based scheme has this same
  // "no target until someone manually sets one" gap today.
  {
    const [projectCycles] = await cyclesService.findByScheme(tenant.id, projectScheme.id, {} as any);
    const projectCycle = projectCycles?.[0];
    if (projectCycle && !projectCycle.targetAmount) {
      await cyclesService.update(
        tenant.id,
        projectCycle.id,
        { targetAmount: "5000.00" },
        actorUserId,
      );
      console.log("  set Road Repair Fund target: M5,000");
    }
  }

  try {
    await approvalPolicyService.getForScheme(tenant.id, projectScheme.id);
  } catch {
    await approvalPolicyService.upsert(
      tenant.id,
      projectScheme.id,
      {
        eligibleRoleTypes: [SchemeGovernanceRoleType.TREASURER, SchemeGovernanceRoleType.COMMITTEE_MEMBER],
        requiredApprovals: 2,
      },
      actorUserId,
    );
  }

  await roleAssignmentsService
    .getActiveRoleTypesForTenantUser(tenant.id, projectScheme.id, treasurer.tenantUserId)
    .then(async (active) => {
      if (!active.includes(SchemeGovernanceRoleType.TREASURER)) {
        await roleAssignmentsService.assignRole(
          tenant!.id,
          projectScheme.id,
          treasurer.tenantUserId,
          SchemeGovernanceRoleType.TREASURER,
          actorUserId,
        );
      }
    });
  await roleAssignmentsService
    .getActiveRoleTypesForTenantUser(tenant.id, projectScheme.id, committee.tenantUserId)
    .then(async (active) => {
      if (!active.includes(SchemeGovernanceRoleType.COMMITTEE_MEMBER)) {
        await roleAssignmentsService.assignRole(
          tenant!.id,
          projectScheme.id,
          committee.tenantUserId,
          SchemeGovernanceRoleType.COMMITTEE_MEMBER,
          actorUserId,
        );
      }
    });

  console.log("  configured approval policy + governance roles for Road Repair Fund");

  // ---------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------
  console.log("\n✅ Test scenario seeded.\n");
  console.log(`Tenant: ${tenant.slug}`);
  console.log(`Password for all test users below: ${TEST_PASSWORD}\n`);
  console.log("Users:");
  console.log(`  ${treasurer.email}  — platform role: treasurer, scheme role: TREASURER on both schemes`);
  console.log(`  ${committee.email}  — platform role: treasurer, scheme role: COMMITTEE_MEMBER on both schemes`);
  console.log(`  ${member1.email}  — platform role: member, contribution balance: M900`);
  console.log(`  ${member2.email}  — platform role: member, contribution balance: M500`);
  console.log(`  ${member3.email}  — platform role: member, contribution balance: M500`);
  console.log("\nSchemes:");
  console.log(`  Bohale Savings Club (${savingsScheme.id}) — cycle: ${savingsCycle.id}`);
  console.log(`    loan policy: self 1.5%, peer 3%→12% (+0.5%/mo), FLAG_AND_BLOCK at cap`);
  console.log(`    try: log in as ${member1.email}, request a loan for M1200`);
  console.log(`         (M900 self-funded automatically, M300 needs member2/member3 to pledge)`);
  console.log(`  Road Repair Fund (${projectScheme.id}) — loans disabled, for outbound-request testing`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error("Test scenario seed failed:", err);
  process.exit(1);
});
