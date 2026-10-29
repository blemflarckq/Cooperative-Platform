import { join } from 'path';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_HOUR: '0 0-23/1 * * *' },
}));

jest.setTimeout(120000);

/**
 * A real end-to-end run of the enrollment flow against a real Postgres —
 * the layer unit tests and the module-wiring test can't reach. It found
 * a bug that made every approval fail (a row lock combined with a join
 * Postgres refuses), which nothing else here could have caught.
 *
 * OFF by default: it only runs when ENROLLMENT_IT_DATABASE_URL is set.
 * It builds the schema from the entities and DROPS IT FIRST on every
 * run, so it refuses to start unless the database name ends in "_it".
 * Create a scratch database for it, never point it at real data:
 *
 *   createdb coop_it
 *   ENROLLMENT_IT_DATABASE_URL=postgres://user:pass@localhost:5432/coop_it \
 *     npx jest membership-enrollment.integration
 */
const dbUrl = process.env.ENROLLMENT_IT_DATABASE_URL;
if (dbUrl && !/\/[^/?]*_it(\?|$)/.test(dbUrl)) {
  throw new Error(
    'Refusing to run: this test DROPS the whole schema, so the database name must end in "_it".',
  );
}
const describeIfEnabled = dbUrl ? describe : describe.skip;

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
describeIfEnabled('enrollment flow against a real Postgres', () => {
  let ds: DataSource;
  let auth: any;
  let enrollment: any;
  let tenantUsersService: any;
  let Mapper: any;
  let TenantUser: any, TenantUserRole: any, Role: any, MembershipEnrollmentRequest: any, InviteLink: any;
  let Loan: any, schedule: any, Permission: any, RolePermission: any;

  let tenantId: string;
  let admin: any, treasurer: any, plainMember: any;
  const state: Record<string, any> = {};
  const PASSWORD = 'correct-horse-9';

  const email = (n: string) => `${n}@example.test`;
  const reg = (n: string, mobile = `+2665000000${n.length}`) =>
    auth.register({ firstName: n, lastName: 'Tester', email: email(n), mobile, password: PASSWORD });

  async function addStaff(userId: string, roleCode: string) {
    const tu = await ds.getRepository(TenantUser).save(
      ds.getRepository(TenantUser).create({ tenantId, userId, isActive: true }),
    );
    const role = await ds.getRepository(Role).findOneOrFail({ where: { tenantId, code: roleCode } });
    await ds.getRepository(TenantUserRole).save(
      ds.getRepository(TenantUserRole).create({ tenantUserId: tu.id, roleId: role.id }),
    );
    return tu;
  }

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'it-access-secret';
    process.env.JWT_REFRESH_SECRET = 'it-refresh-secret';
    const { MembershipModule } = require('./membership.module');
    const { AuthService } = require('../../common/auth/auth.service');
    const { MembershipEnrollmentService } = require('./services/membership-enrollment.service');
    const { TenantUsersService } = require('../identity/services/tenant-users.service');
    ({ TenantUserResponseMapper: Mapper } = require('../identity/mappers/tenant-user-response.mapper'));
    ({ TenantUser } = require('../identity/entities/tenant-user.entity'));
    ({ TenantUserRole } = require('../identity/entities/tenant-user-role.entity'));
    ({ Role } = require('../identity/entities/role.entity'));
    ({ MembershipEnrollmentRequest } = require('./entities/membership-enrollment-request.entity'));
    ({ InviteLink } = require('./entities/invite-link.entity'));
    ({ Loan } = require('../loans/entities/loan.entity'));
    ({ Permission } = require('../identity/entities/permission.entity'));
    ({ RolePermission } = require('../identity/entities/role-permission.entity'));
    const { seedPermissions } = require('../../seed/permissions.seed');
    const { LoansModule } = require('../loans/loans.module');
    const { LoanRateScheduleService } = require('../loans/services/loan-rate-schedule.service');

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: dbUrl,
          entities: [join(__dirname, '../../**/*.entity.ts')],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
          retryAttempts: 1,
        }),
        MembershipModule,
        LoansModule,
      ],
    }).compile();

    ds = moduleRef.get(DataSource);
    await seedPermissions(ds);
    auth = moduleRef.get(AuthService, { strict: false });
    enrollment = moduleRef.get(MembershipEnrollmentService, { strict: false });
    tenantUsersService = moduleRef.get(TenantUsersService, { strict: false });
    schedule = moduleRef.get(LoanRateScheduleService, { strict: false });
  });

  afterAll(async () => { await ds?.destroy(); });

  it('creates a cooperative with an admin', async () => {
    const r = await reg('admin');
    expect(r.status).toBe('no_tenant');
    const session = await auth.createTenant(r.preAuthToken, 'Bohale Test Coop');
    tenantId = session.user.tenantId;
    admin = await ds.getRepository(TenantUser).findOneOrFail({ where: { tenantId, userId: session.user.id } });
    expect(session.user.roles).toContain('Tenant Administrator');
  });

  it('adds a treasurer and a plain member', async () => {
    const t = await reg('treasurer'); const m = await reg('plainmember');
    const tu = await auth.loadUserFromPreAuthToken(t.preAuthToken);
    const mu = await auth.loadUserFromPreAuthToken(m.preAuthToken);
    treasurer = await addStaff(tu.id, 'treasurer');
    plainMember = await addStaff(mu.id, 'member');
    state.treasurerUserId = tu.id; state.plainUserId = mu.id;
  });

  it('a stranger with no cooperative gets the create-cooperative path', async () => {
    const r = await reg('invitee', '+26658123456');
    expect(r.status).toBe('no_tenant');
    state.invitee = await auth.loadUserFromPreAuthToken(r.preAuthToken);
    state.inviteePreAuth = r.preAuthToken;
  });

  it('admin creates an invite; the public preview is valid; a plain member cannot create one', async () => {
    state.adminUserId = admin.userId;
    const link = await enrollment.generateInviteLink(tenantId, admin.userId);
    state.token = link.token;
    expect((await enrollment.getInviteLinkPreview(link.token))).toMatchObject({ valid: true, tenantName: 'Bohale Test Coop' });
    await expect(enrollment.generateInviteLink(tenantId, state.plainUserId)).rejects.toThrow(/permission/);
  });

  it('the invitee joins using only a pre-auth token → request pending', async () => {
    const user = await auth.loadUserFromPreAuthToken(state.inviteePreAuth);
    const result = await enrollment.acceptInvite(state.token, user.id);
    expect(result).toMatchObject({ status: 'PENDING_APPROVAL', tenantName: 'Bohale Test Coop' });
    expect((await enrollment.getInviteLinkPreview(state.token)).reason).toBe('already_used');
  });

  it('POINT 1 — signing in again while pending gives pending_enrollment, not the wizard', async () => {
    const r = await auth.login({ email: email('invitee'), password: PASSWORD });
    expect(r).toEqual({ status: 'pending_enrollment', tenantName: 'Bohale Test Coop' });
    expect(JSON.stringify(r)).not.toContain('preAuthToken');
  });

  it('approvers see the applicant masked, and no password hash anywhere', async () => {
    const list = await enrollment.listPendingEnrollments(tenantId, admin.userId);
    expect(list).toHaveLength(1);
    expect(list[0].applicant.mobileMasked).toBe('+266 •••••456');
    const json = JSON.stringify(list);
    expect(json).not.toContain('passwordHash');
    expect(json).not.toMatch(/\$2[aby]\$/);
    expect(json).not.toContain('58123456');
    state.enrollmentId = list[0].id;
  });

  it('a plain member cannot list the queue or decide', async () => {
    await expect(enrollment.listPendingEnrollments(tenantId, state.plainUserId)).rejects.toThrow(/permission/);
    await expect(enrollment.recordApproval(tenantId, state.enrollmentId, state.plainUserId, 'APPROVED')).rejects.toThrow();
  });

  it('one approval stays pending; the same approver cannot decide twice; the second approval admits them as a member', async () => {
    expect((await enrollment.recordApproval(tenantId, state.enrollmentId, admin.userId, 'APPROVED')).status).toBe('PENDING_APPROVAL');
    await expect(enrollment.recordApproval(tenantId, state.enrollmentId, admin.userId, 'APPROVED')).rejects.toThrow(/already/);
    const afterOne = await enrollment.listPendingEnrollments(tenantId, admin.userId);
    expect(afterOne[0].viewerHasDecided).toBe(true);
    expect((await enrollment.recordApproval(tenantId, state.enrollmentId, treasurer.userId, 'APPROVED')).status).toBe('APPROVED');

    const tu = await ds.getRepository(TenantUser).findOneOrFail({
      where: { tenantId, userId: state.invitee.id }, relations: { roles: { role: true } },
    });
    expect(tu.roles.map((x: any) => x.role.code)).toEqual(['member']);
  });

  it('the new member now signs straight into the cooperative', async () => {
    const r = await auth.login({ email: email('invitee'), password: PASSWORD });
    expect(r.status).toBe('authenticated');
    expect(r.user.tenantName).toBe('Bohale Test Coop');
  });

  it('POINT 2 — one approval + 3 days → EXPIRED and kept; zero approvals past the window → deleted', async () => {
    const half = await reg('halfway'); const none = await reg('nobody');
    const halfUser = await auth.loadUserFromPreAuthToken(half.preAuthToken);
    const noneUser = await auth.loadUserFromPreAuthToken(none.preAuthToken);
    const l1 = await enrollment.generateInviteLink(tenantId, admin.userId);
    const l2 = await enrollment.generateInviteLink(tenantId, admin.userId);
    await enrollment.acceptInvite(l1.token, halfUser.id);
    await enrollment.acceptInvite(l2.token, noneUser.id);

    const queue = await enrollment.listPendingEnrollments(tenantId, admin.userId);
    const halfReq = queue.find((q: any) => q.applicant.fullName.startsWith('halfway'));
    await enrollment.recordApproval(tenantId, halfReq.id, admin.userId, 'APPROVED');

    // age both requests: created 3 days ago, invite window closed 68 hours ago
    await ds.query(`UPDATE membership_enrollment_requests SET "createdAt" = now() - interval '3 days', "expiresAt" = now() - interval '68 hours' WHERE status = 'PENDING_APPROVAL'`);

    // lapsed requests vanish from the queue and can't be decided, BEFORE cleanup runs
    expect(await enrollment.listPendingEnrollments(tenantId, admin.userId)).toHaveLength(0);
    await expect(enrollment.recordApproval(tenantId, halfReq.id, treasurer.userId, 'APPROVED')).rejects.toThrow(/expired/);

    // and they are no longer "pending" at sign-in either
    expect((await auth.login({ email: email('halfway'), password: PASSWORD })).status).toBe('no_tenant');
    expect((await auth.login({ email: email('nobody'), password: PASSWORD })).status).toBe('no_tenant');

    const out = await enrollment.cleanupExpiredEnrollments();
    expect(out.expiredEnrollments).toBe(1);
    expect(out.deletedInviteLinks).toBeGreaterThanOrEqual(1);

    const repo = ds.getRepository(MembershipEnrollmentRequest);
    expect((await repo.findOneOrFail({ where: { userId: halfUser.id } })).status).toBe('EXPIRED');
    expect(await repo.findOne({ where: { userId: noneUser.id } })).toBeNull();
    // the half-approved person's approval trail was kept
    const kept = await ds.query(`SELECT count(*)::int AS n FROM membership_enrollment_approvals WHERE "enrollmentRequestId" = $1`, [(await repo.findOneOrFail({ where: { userId: halfUser.id } })).id]);
    expect(kept[0].n).toBe(1);

    // an expired applicant can simply start again with a fresh link
    const fresh = await enrollment.generateInviteLink(tenantId, admin.userId);
    expect((await enrollment.acceptInvite(fresh.token, halfUser.id)).status).toBe('PENDING_APPROVAL');
  });

  it('the members list masks every phone, never ships a hash, and returns scheme names', async () => {
    const rows = await tenantUsersService.listTenantUsers(tenantId, {});
    const json = JSON.stringify(rows.map((r: any) => Mapper.toResponse(r.tenantUser, r.schemeNames)));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(json).toContain('mobileMasked');
    expect(json).not.toContain('passwordHash');
    expect(json).not.toMatch(/\$2[aby]\$/);
    expect(json).not.toContain('58123456');
    expect(rows.every((r: any) => Array.isArray(r.schemeNames))).toBe(true);
  });

  it('INVITEE ALREADY IN ANOTHER COOPERATIVE (signed in) — joins, keeps their own cooperative meanwhile, ends up in both', async () => {
    const x = await reg('xavier');
    const session = await auth.createTenant(x.preAuthToken, 'Xavier Coop');
    const link = await enrollment.generateInviteLink(tenantId, admin.userId);

    const joined = await enrollment.acceptInvite(link.token, session.user.id);
    expect(joined).toMatchObject({ status: 'PENDING_APPROVAL', tenantName: 'Bohale Test Coop' });

    // A pending request elsewhere must NOT hijack sign-in: they have a cooperative of their own.
    const during = await auth.login({ email: email('xavier'), password: PASSWORD });
    expect(during.status).toBe('authenticated');
    expect(during.user.tenantName).toBe('Xavier Coop');

    const queue = await enrollment.listPendingEnrollments(tenantId, admin.userId);
    const req = queue.find((q: any) => q.applicant.fullName.startsWith('xavier'));
    await enrollment.recordApproval(tenantId, req.id, admin.userId, 'APPROVED');
    await enrollment.recordApproval(tenantId, req.id, treasurer.userId, 'APPROVED');

    const after = await auth.login({ email: email('xavier'), password: PASSWORD });
    expect(after.status).toBe('select_tenant');
    expect(after.tenants.map((t: any) => t.name).sort()).toEqual(['Bohale Test Coop', 'Xavier Coop']);

    const inB = await auth.selectTenant(after.preAuthToken, tenantId);
    expect(inB.user.tenantName).toBe('Bohale Test Coop');
    expect(inB.user.roles).toEqual(['Member']);
  });

  it('INVITEE IN SEVERAL COOPERATIVES (pre-auth only) — can follow a third invite; sign-in is unaffected while it is pending', async () => {
    const z = await reg('zed');
    const zSession = await auth.createTenant(z.preAuthToken, 'Zed Coop');
    const zLink = await enrollment.generateInviteLink(zSession.user.tenantId, zSession.user.id);

    const login = await auth.login({ email: email('xavier'), password: PASSWORD });
    expect(login.status).toBe('select_tenant'); // two cooperatives, so only a pre-auth token — no access token
    const person = await auth.loadUserFromPreAuthToken(login.preAuthToken);
    expect((await enrollment.acceptInvite(zLink.token, person.id)).tenantName).toBe('Zed Coop');

    const again = await auth.login({ email: email('xavier'), password: PASSWORD });
    expect(again.status).toBe('select_tenant');
    expect(again.tenants).toHaveLength(2);
  });

  it('RATE SCHEDULE on real loans — periods by age, ramp catch-up on its own rhythm, flags, idempotent, no re-stamping', async () => {
    const { randomUUID } = require('crypto');
    const NOW = new Date('2026-10-10T08:00:00Z');
    const monthsAgo = (m: number, extraDays = 0) => {
      const dt = new Date(NOW);
      dt.setUTCMonth(dt.getUTCMonth() - m);
      dt.setUTCDate(dt.getUTCDate() - extraDays);
      return dt;
    };
    const base = (over: Record<string, any>) => ({
      id: randomUUID(), tenantId, schemeId: randomUUID(), cycleId: randomUUID(), borrowerTenantUserId: randomUUID(),
      principalAmount: '1000.00', selfFundedPrincipal: '400.00', selfFundedOutstandingPrincipal: '400.00',
      selfFundedMonthlyRate: '2.00', peerFundedPrincipal: '600.00', peerFundedOutstandingPrincipal: '600.00',
      currentPeerMonthlyRate: '5.00', peerMonthlyRateIncrement: '1.00', peerCapRate: '12.00',
      atCapBehavior: 'CONTINUE_AT_CAP', status: 'ACTIVE', ...over,
    });
    const periods = { rateScheduleMode: 'PERIODS', initialPeriodMonths: 3, laterPeriodMonths: 3, peerInitialMonthlyRate: '5.00', peerLaterMonthlyRate: '8.00' };
    const L = {
      periodsLater: base({ ...periods, disbursedAt: monthsAgo(4) }),
      periodsCutoffFlag: base({ ...periods, atCapBehavior: 'FLAG_AND_BLOCK', disbursedAt: monthsAgo(8) }),
      rampCatchUp: base({ peerCapRate: '8.00', peerRateLastEscalatedAt: monthsAgo(3, 5) }),
      rampAtCapFlag: base({ currentPeerMonthlyRate: '8.00', peerCapRate: '8.00', atCapBehavior: 'FLAG_AND_BLOCK', peerRateLastEscalatedAt: monthsAgo(1, 1) }),
      noPeerPrincipal: base({ ...periods, peerFundedOutstandingPrincipal: '0.00', disbursedAt: monthsAgo(8) }),
      notLive: base({ ...periods, status: 'PENDING_APPROVAL', disbursedAt: monthsAgo(8) }),
      noDate: base({ ...periods, disbursedAt: null }),
    };

    // These loans point at no real scheme/cycle/borrower, so the FK checks are switched off for the inserts only.
    const qr = ds.createQueryRunner();
    await qr.connect();
    try {
      await qr.query('SET session_replication_role = replica');
      for (const row of Object.values(L)) await qr.manager.insert(Loan, row);
    } finally {
      await qr.query('SET session_replication_role = DEFAULT');
      await qr.release();
    }
    const get = (l: any) => ds.getRepository(Loan).findOneOrFail({ where: { id: l.id } });

    const first = await schedule.applyDueRates(NOW);
    expect(first).toEqual({ examined: 6, changed: 4, newlyFlagged: 2, skipped: 1, failed: 0 });

    expect(Number((await get(L.periodsLater)).currentPeerMonthlyRate)).toBe(8);

    const cutoff = await get(L.periodsCutoffFlag);
    expect(Number(cutoff.currentPeerMonthlyRate)).toBe(12);
    expect([cutoff.isAtRiskFlagged, cutoff.status]).toEqual([true, 'AT_RISK']);
    expect(cutoff.flaggedAtRiskAt.toISOString()).toBe(NOW.toISOString());

    const ramp = await get(L.rampCatchUp);
    expect(Number(ramp.currentPeerMonthlyRate)).toBe(8); // 6, 7, 8 — three missed months caught up
    expect(ramp.peerRateLastEscalatedAt.toISOString()).toBe('2026-10-05T08:00:00.000Z'); // anchor + 3 months, NOT "now"

    expect((await get(L.rampAtCapFlag)).isAtRiskFlagged).toBe(true);
    expect(Number((await get(L.noPeerPrincipal)).currentPeerMonthlyRate)).toBe(5);
    expect(Number((await get(L.notLive)).currentPeerMonthlyRate)).toBe(5);
    expect(Number((await get(L.noDate)).currentPeerMonthlyRate)).toBe(5); // skipped, never guessed
    for (const l of Object.values(L)) expect(Number((await get(l)).selfFundedMonthlyRate)).toBe(2); // self-funded never moves

    // Running it again at the same moment changes nothing — safe on two servers, safe after an outage.
    expect(await schedule.applyDueRates(NOW)).toEqual({ examined: 6, changed: 0, newlyFlagged: 0, skipped: 1, failed: 0 });

    // And a later run must not re-stamp when an already-flagged loan became at risk.
    await schedule.applyDueRates(new Date('2026-11-24T08:00:00Z'));
    expect((await get(L.periodsCutoffFlag)).flaggedAtRiskAt.toISOString()).toBe(NOW.toISOString());
  });

  it('PERMISSIONS ARE SEPARATE — a role granted only "invite" can invite, but can neither see the queue nor decide', async () => {
    const sec = await reg('secretaryone');
    const secUser = await auth.loadUserFromPreAuthToken(sec.preAuthToken);
    await addStaff(secUser.id, 'secretary');
    const secretaryRole = await ds.getRepository(Role).findOneOrFail({ where: { tenantId, code: 'secretary' } });
    const invitePerm = await ds.getRepository(Permission).findOneOrFail({ where: { code: 'membership:invite' } });

    // out of the box a secretary holds neither
    await expect(enrollment.generateInviteLink(tenantId, secUser.id)).rejects.toThrow(/permission/);

    await ds.getRepository(RolePermission).save(
      ds.getRepository(RolePermission).create({ roleId: secretaryRole.id, permissionId: invitePerm.id }),
    );

    const link = await enrollment.generateInviteLink(tenantId, secUser.id);
    expect(link.token).toEqual(expect.any(String));
    await expect(enrollment.listPendingEnrollments(tenantId, secUser.id)).rejects.toThrow(/permission/);

    const mia = await reg('mia');
    const miaUser = await auth.loadUserFromPreAuthToken(mia.preAuthToken);
    await enrollment.acceptInvite(link.token, miaUser.id);
    const queue = await enrollment.listPendingEnrollments(tenantId, admin.userId);
    const miaRequest = queue.find((q: any) => q.applicant.fullName.startsWith('mia'));
    await expect(enrollment.recordApproval(tenantId, miaRequest.id, secUser.id, 'APPROVED')).rejects.toThrow(/permission/);
  });

  it('PERMISSIONS — taking one away takes effect on the very next action, not at the next sign-in', async () => {
    const treasurerRole = await ds.getRepository(Role).findOneOrFail({ where: { tenantId, code: 'treasurer' } });
    const approvePerm = await ds.getRepository(Permission).findOneOrFail({ where: { code: 'membership:approve' } });
    const grants = ds.getRepository(RolePermission);
    const grant = await grants.findOneOrFail({ where: { roleId: treasurerRole.id, permissionId: approvePerm.id } });

    await expect(enrollment.listPendingEnrollments(tenantId, treasurer.userId)).resolves.toBeDefined();
    await grants.delete({ id: grant.id });
    await expect(enrollment.listPendingEnrollments(tenantId, treasurer.userId)).rejects.toThrow(/permission/);
    await grants.save(grants.create({ roleId: treasurerRole.id, permissionId: approvePerm.id }));
    await expect(enrollment.listPendingEnrollments(tenantId, treasurer.userId)).resolves.toBeDefined();
  });

  it('the permissions reach the sign-in token — the thing the route guard and the screens actually read', async () => {
    const asTreasurer = await auth.login({ email: email('treasurer'), password: PASSWORD });
    expect(asTreasurer.status).toBe('authenticated');
    expect(asTreasurer.user.permissions).toEqual(expect.arrayContaining(['membership:invite', 'membership:approve']));

    const asMember = await auth.login({ email: email('plainmember'), password: PASSWORD });
    expect(asMember.user.permissions).not.toContain('membership:invite');
    expect(asMember.user.permissions).not.toContain('membership:approve');
  });

  it('COOPERATIVE SWITCHER — lists every cooperative, switches on the refresh token, and each session carries the TARGET cooperative\'s own roles', async () => {
    const mine = await auth.login({ email: email('xavier'), password: PASSWORD });
    expect(mine.status).toBe('select_tenant');
    const xavierCoop = mine.tenants.find((t: any) => t.name === 'Xavier Coop');
    const bohale = mine.tenants.find((t: any) => t.name === 'Bohale Test Coop');
    const inXavier = await auth.selectTenant(mine.preAuthToken, xavierCoop.id);

    expect((await auth.listMyTenants(inXavier.user.id)).map((t: any) => t.name)).toEqual(['Bohale Test Coop', 'Xavier Coop']);

    const inBohale = await auth.switchTenant(inXavier.refreshToken, bohale.id);
    expect(inBohale.user.tenantName).toBe('Bohale Test Coop');
    expect(inBohale.user.roles).toEqual(['Member']);
    expect(inBohale.user.permissions).not.toContain('membership:approve'); // a member THERE, however powerful elsewhere

    const back = await auth.switchTenant(inBohale.refreshToken, xavierCoop.id);
    expect(back.user.tenantName).toBe('Xavier Coop');
    expect(back.user.permissions).toEqual(expect.arrayContaining(['membership:invite', 'membership:approve']));

    // Ordinary refresh shares the extracted token check — it must still work, and stay put.
    const refreshed = await auth.refresh(back.refreshToken);
    expect(refreshed.user.tenantName).toBe('Xavier Coop');
  });

  it('COOPERATIVE SWITCHER — refuses an access token, a garbage token, a cooperative they are not in, and a deactivated membership', async () => {
    const mine = await auth.login({ email: email('xavier'), password: PASSWORD });
    const bohale = mine.tenants.find((t: any) => t.name === 'Bohale Test Coop');
    const xavierCoop = mine.tenants.find((t: any) => t.name === 'Xavier Coop');
    const session = await auth.selectTenant(mine.preAuthToken, xavierCoop.id);
    const zed = await auth.login({ email: email('zed'), password: PASSWORD });

    // a stolen 15-minute access token must not be convertible into a long-lived session elsewhere
    await expect(auth.switchTenant(session.accessToken, bohale.id)).rejects.toThrow(/refresh token/i);
    await expect(auth.switchTenant('not-a-token', bohale.id)).rejects.toThrow(/refresh token/i);
    await expect(auth.switchTenant(session.refreshToken, zed.user.tenantId)).rejects.toThrow(/do not belong/);

    const membership = await ds.getRepository(TenantUser).findOneOrFail({ where: { tenantId: bohale.id, userId: session.user.id } });
    await ds.getRepository(TenantUser).update({ id: membership.id }, { isActive: false });
    await expect(auth.switchTenant(session.refreshToken, bohale.id)).rejects.toThrow(/do not belong/);
    expect((await auth.listMyTenants(session.user.id)).map((t: any) => t.name)).toEqual(['Xavier Coop']);
    await ds.getRepository(TenantUser).update({ id: membership.id }, { isActive: true });
  });
});
