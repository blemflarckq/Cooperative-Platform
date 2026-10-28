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
      ],
    }).compile();

    ds = moduleRef.get(DataSource);
    auth = moduleRef.get(AuthService, { strict: false });
    enrollment = moduleRef.get(MembershipEnrollmentService, { strict: false });
    tenantUsersService = moduleRef.get(TenantUsersService, { strict: false });
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
    await expect(enrollment.generateInviteLink(tenantId, state.plainUserId)).rejects.toThrow(/admin or treasurer/);
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
    await expect(enrollment.listPendingEnrollments(tenantId, state.plainUserId)).rejects.toThrow(/admin or treasurer/);
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
});
