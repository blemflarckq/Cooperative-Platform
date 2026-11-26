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
 * Member governance — roles, deactivation, reactivation, name edits —
 * against a real Postgres. The unit spec proves each rule in isolation;
 * this proves the services gather the facts correctly, enforce them
 * under a lock, and that the changes land (and are announced) as they
 * should. In particular the concurrency test: two administrators
 * demoting each other at the same instant must leave exactly one.
 *
 * OFF by default, same as the enrollment integration test: it needs a
 * scratch database whose name ends in "_it" (it DROPS the schema first):
 *
 *   createdb coop_gov_it
 *   ENROLLMENT_IT_DATABASE_URL=postgres://user:pass@localhost:5432/coop_gov_it \
 *     npx jest tenant-user-governance.integration
 */
const dbUrl = process.env.ENROLLMENT_IT_DATABASE_URL;
if (dbUrl && !/\/[^/?]*_it(\?|$)/.test(dbUrl)) {
  throw new Error(
    'Refusing to run: this test DROPS the whole schema, so the database name must end in "_it".',
  );
}
const describeIfEnabled = dbUrl ? describe : describe.skip;

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
describeIfEnabled('member governance against a real Postgres', () => {
  let ds: DataSource;
  let auth: any;
  let users: any; // TenantUsersService
  let invitations: any; // TenantUserInvitationsService
  let roles: any; // TenantUserRolesService
  let TenantUser: any, TenantUserRole: any, Role: any, User: any, OutboxEvent: any;

  let tenantId: string;
  let otherTenantId: string;
  const PASSWORD = 'correct-horse-9';
  let mobileCounter = 0;

  const email = (n: string) => `${n}@example.test`;
  const reg = (n: string) =>
    auth.register({
      firstName: n,
      lastName: 'Tester',
      email: email(n),
      mobile: `+2665100${String(++mobileCounter).padStart(4, '0')}`,
      password: PASSWORD,
    });

  const roleId = async (code: string, tid = tenantId) =>
    (await ds.getRepository(Role).findOneOrFail({ where: { tenantId: tid, code } })).id;

  async function addMember(name: string, roleCode: string) {
    const r = await reg(name);
    const user = await auth.loadUserFromPreAuthToken(r.preAuthToken);
    const tu = await ds
      .getRepository(TenantUser)
      .save(ds.getRepository(TenantUser).create({ tenantId, userId: user.id, isActive: true }));
    await ds
      .getRepository(TenantUserRole)
      .save(
        ds.getRepository(TenantUserRole).create({ tenantUserId: tu.id, roleId: await roleId(roleCode) }),
      );
    return { user, tu, userId: user.id as string, id: tu.id as string };
  }

  const codesOf = async (tenantUserId: string) =>
    (
      await ds.getRepository(TenantUserRole).find({ where: { tenantUserId } })
    )
      .map((r: any) => r.role.code)
      .sort();

  const events = (aggregateId: string, type: string) =>
    ds.getRepository(OutboxEvent).count({ where: { aggregateId, eventType: type } });

  let admin: any, treasurer: any, member1: any, member2: any, member3: any;
  let lockCooperative: any;

  /**
   * Holds the cooperative's lock in a transaction of the test's own, starts
   * `operation`, and reports whether it finished while the lock was held.
   * A change that is correctly serialised must still be waiting; once the
   * lock is released it must complete. Deterministic — unlike racing two
   * requests and hoping they interleave badly enough to expose a missing lock.
   */
  async function finishesWhileLockIsHeld(operation: () => Promise<unknown>): Promise<boolean> {
    const holder = ds.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await lockCooperative(holder.manager, tenantId);

    let finished = false;
    const running = operation().then(
      () => { finished = true; },
      () => { finished = true; },
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    const finishedWhileHeld = finished;

    await holder.commitTransaction();
    await holder.release();
    await running;
    return finishedWhileHeld;
  }

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'it-access-secret';
    process.env.JWT_REFRESH_SECRET = 'it-refresh-secret';
    const { MembershipModule } = require('../membership/membership.module');
    const { LoansModule } = require('../loans/loans.module');
    const { AuthService } = require('../../common/auth/auth.service');
    const { TenantUsersService } = require('./services/tenant-users.service');
    const { TenantUserRolesService } = require('./services/tenant-user-roles.service');
    const { TenantUserInvitationsService } = require('./services/tenant-user-invitations.service');
    ({ TenantUser } = require('./entities/tenant-user.entity'));
    ({ TenantUserRole } = require('./entities/tenant-user-role.entity'));
    ({ Role } = require('./entities/role.entity'));
    ({ User } = require('./entities/user.entity'));
    ({ OutboxEvent } = require('../../common/messaging/outbox-event.entity'));
    const { seedPermissions } = require('../../seed/permissions.seed');
    ({ lockCooperative } = require('./services/tenant-user-governance'));

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: dbUrl,
          entities: [join(__dirname, '../../**/*.entity.ts')],
          autoLoadEntities: true,
          dropSchema: true,
          ...(process.env.ENROLLMENT_IT_SCHEMA === 'migrations'
            ? { synchronize: false, migrationsRun: true, migrations: [join(__dirname, '../../migrations/*.{ts,js}')] }
            : { synchronize: true }),
          retryAttempts: 1,
        }),
        MembershipModule,
        LoansModule,
      ],
    }).compile();

    ds = moduleRef.get(DataSource);
    await seedPermissions(ds);
    auth = moduleRef.get(AuthService, { strict: false });
    users = moduleRef.get(TenantUsersService, { strict: false });
    roles = moduleRef.get(TenantUserRolesService, { strict: false });
    invitations = moduleRef.get(TenantUserInvitationsService, { strict: false });
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  it('sets up a cooperative with an administrator, a treasurer and three members', async () => {
    const r = await reg('govadmin');
    const session = await auth.createTenant(r.preAuthToken, 'Governance Test Coop');
    tenantId = session.user.tenantId;
    const adminTu = await ds.getRepository(TenantUser).findOneOrFail({ where: { tenantId, userId: session.user.id } });
    admin = { id: adminTu.id, userId: adminTu.userId };

    treasurer = await addMember('govtreasurer', 'treasurer');
    member1 = await addMember('govmember1', 'member');
    member2 = await addMember('govmember2', 'member');
    member3 = await addMember('govmember3', 'member');

    // A second, unrelated cooperative — for the cross-cooperative checks.
    const o = await reg('govother');
    const other = await auth.createTenant(o.preAuthToken, 'Some Other Coop');
    otherTenantId = other.user.tenantId;
  });

  describe('the roles list', () => {
    it('for an administrator: every role, none locked, most authority first', async () => {
      const list = await roles.listAssignableRoles(tenantId, admin.userId);
      expect(list.map((r: any) => r.code)).toEqual(['tenant_admin', 'treasurer', 'secretary', 'member']);
      expect(list.every((r: any) => r.canAssign && r.lockedReason === null)).toBe(true);
    });

    it('for a treasurer: the administrator role is locked, with a plain reason', async () => {
      const list = await roles.listAssignableRoles(tenantId, treasurer.userId);
      const adminRole = list.find((r: any) => r.code === 'tenant_admin');
      expect(adminRole.canAssign).toBe(false);
      expect(adminRole.lockedReason).toMatch(/Only a cooperative administrator/);
      expect(list.filter((r: any) => r.code !== 'tenant_admin').every((r: any) => r.canAssign)).toBe(true);
    });

    it('is not available to someone who is not an active member', async () => {
      const stranger = await auth.loadUserFromPreAuthToken((await reg('govstranger')).preAuthToken);
      await expect(roles.listAssignableRoles(tenantId, stranger.id)).rejects.toThrow(/not an active member/);
    });
  });

  describe('changing roles', () => {
    it('a treasurer can add a role; it is announced once, and repeating it is a quiet no-op', async () => {
      const secretary = await roleId('secretary');
      const result = await roles.assignRoles(tenantId, member1.id, [secretary], treasurer.userId);
      expect(result.roles.map((r: any) => r.role.code).sort()).toEqual(['member', 'secretary']);
      expect(await events(member1.id, 'identity.tenant_user.roles.assigned.v1')).toBe(1);

      await roles.assignRoles(tenantId, member1.id, [secretary], treasurer.userId);
      expect(await events(member1.id, 'identity.tenant_user.roles.assigned.v1')).toBe(1);
    });

    it('replace swaps exactly the difference', async () => {
      const treasurerRole = await roleId('treasurer');
      await roles.replaceRoles(tenantId, member1.id, [treasurerRole], treasurer.userId);
      expect(await codesOf(member1.id)).toEqual(['treasurer']);
      await roles.replaceRoles(tenantId, member1.id, [await roleId('member')], treasurer.userId);
      expect(await codesOf(member1.id)).toEqual(['member']);
    });

    it('revoke removes only what was asked', async () => {
      await roles.assignRoles(tenantId, member1.id, [await roleId('secretary')], treasurer.userId);
      await roles.revokeRoles(tenantId, member1.id, [await roleId('secretary')], treasurer.userId);
      expect(await codesOf(member1.id)).toEqual(['member']);
    });

    it('a treasurer cannot make anyone an administrator — including through replace', async () => {
      const adminRole = await roleId('tenant_admin');
      await expect(roles.assignRoles(tenantId, member1.id, [adminRole], treasurer.userId)).rejects.toThrow(
        /Only a cooperative administrator/,
      );
      await expect(
        roles.replaceRoles(tenantId, member1.id, [adminRole, await roleId('member')], treasurer.userId),
      ).rejects.toThrow(/Only a cooperative administrator/);
      expect(await codesOf(member1.id)).toEqual(['member']);
    });

    it('nobody can change their own roles — administrator or not', async () => {
      await expect(
        roles.assignRoles(tenantId, treasurer.id, [await roleId('secretary')], treasurer.userId),
      ).rejects.toThrow(/own roles/);
      await expect(
        roles.replaceRoles(tenantId, admin.id, [await roleId('tenant_admin'), await roleId('treasurer')], admin.userId),
      ).rejects.toThrow(/own roles/);
    });

    it('everyone keeps at least one role', async () => {
      await expect(roles.replaceRoles(tenantId, member1.id, [], treasurer.userId)).rejects.toThrow(/at least one role/);
      await expect(
        roles.revokeRoles(tenantId, member1.id, [await roleId('member')], treasurer.userId),
      ).rejects.toThrow(/at least one role/);
      expect(await codesOf(member1.id)).toEqual(['member']);
    });

    it("a role from another cooperative is refused, not silently ignored", async () => {
      const foreign = await roleId('secretary', otherTenantId);
      await expect(roles.assignRoles(tenantId, member1.id, [foreign], treasurer.userId)).rejects.toThrow(
        /invalid or belong to another cooperative/,
      );
    });

    it('a member of one cooperative cannot be reached through another', async () => {
      await expect(
        roles.assignRoles(otherTenantId, member1.id, [await roleId('secretary', otherTenantId)], admin.userId),
      ).rejects.toThrow();
    });

    it("someone whose membership has been switched off can no longer change roles — whatever their token says", async () => {
      const lapsed = await addMember('govlapsed', 'treasurer');
      await ds.getRepository(TenantUser).update({ id: lapsed.id }, { isActive: false });
      await expect(
        roles.assignRoles(tenantId, member1.id, [await roleId('secretary')], lapsed.userId),
      ).rejects.toThrow(/not an active member/);
    });
  });

  describe('administrators', () => {
    it('an administrator can appoint another administrator', async () => {
      await roles.assignRoles(tenantId, member2.id, [await roleId('tenant_admin')], admin.userId);
      expect(await codesOf(member2.id)).toEqual(['member', 'tenant_admin']);
    });

    it('a treasurer still cannot touch an administrator’s administrator role', async () => {
      await expect(
        roles.revokeRoles(tenantId, member2.id, [await roleId('tenant_admin')], treasurer.userId),
      ).rejects.toThrow(/Only a cooperative administrator/);
    });

    it('an administrator whose account is switched off does not count — the last real one cannot be demoted', async () => {
      await ds.getRepository(User).update({ id: member2.userId }, { isActive: false });
      // member2 (still an admin, but their account is off) tries to demote the only working administrator.
      await expect(
        roles.replaceRoles(tenantId, admin.id, [await roleId('member')], member2.userId),
      ).rejects.toThrow(/at least one active administrator/);
      await expect(users.deactivateTenantUser(tenantId, admin.id, member2.userId)).rejects.toThrow(
        /at least one active administrator/,
      );
      await ds.getRepository(User).update({ id: member2.userId }, { isActive: true });
    });

    it('two administrators demoting each other at the same instant leave exactly one', async () => {
      const memberRole = await roleId('member');
      const results = await Promise.allSettled([
        roles.replaceRoles(tenantId, member2.id, [memberRole], admin.userId),
        roles.replaceRoles(tenantId, admin.id, [memberRole], member2.userId),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const survivors = [
        ...(await codesOf(admin.id)),
        ...(await codesOf(member2.id)),
      ].filter((c) => c === 'tenant_admin');
      expect(survivors).toHaveLength(1);

      // Put things back for the tests that follow: both administrators again.
      const adminRole = await roleId('tenant_admin');
      const holder = (await codesOf(admin.id)).includes('tenant_admin') ? admin : member2;
      const other = holder === admin ? member2 : admin;
      await roles.assignRoles(tenantId, other.id, [adminRole], holder.userId);
      expect(await codesOf(admin.id)).toContain('tenant_admin');
      expect(await codesOf(member2.id)).toContain('tenant_admin');
    });
  });

  describe('deactivating and reactivating', () => {
    it('a treasurer deactivates a member: switched off, kept, announced', async () => {
      await users.deactivateTenantUser(tenantId, member3.id, treasurer.userId);
      const row = await ds.getRepository(TenantUser).findOneOrFail({ where: { id: member3.id } });
      expect(row.isActive).toBe(false);
      expect(row.status).toBe('suspended');
      expect(await codesOf(member3.id)).toEqual(['member']); // roles untouched
      expect(await events(member3.id, 'identity.tenant_user.deactivated.v1')).toBe(1);
    });

    it('a deactivated member can no longer sign in to the cooperative', async () => {
      const r = await auth.login({ email: email('govmember3'), password: PASSWORD });
      expect(r.status).not.toBe('authenticated');
    });

    it('deactivating twice is refused', async () => {
      await expect(users.deactivateTenantUser(tenantId, member3.id, treasurer.userId)).rejects.toThrow(
        /already deactivated/,
      );
    });

    it('reactivating brings them back exactly as they were, and they can sign in again', async () => {
      const result = await users.reactivateTenantUser(tenantId, member3.id, treasurer.userId);
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
      expect(result.roles.map((r: any) => r.role.code)).toEqual(['member']);
      expect(await events(member3.id, 'identity.tenant_user.reactivated.v1')).toBe(1);

      const r = await auth.login({ email: email('govmember3'), password: PASSWORD });
      expect(r.status).toBe('authenticated');
    });

    it('reactivating someone who is already active is refused', async () => {
      await expect(users.reactivateTenantUser(tenantId, member3.id, treasurer.userId)).rejects.toThrow(
        /already active/,
      );
    });

    it('nobody can deactivate themselves', async () => {
      await expect(users.deactivateTenantUser(tenantId, treasurer.id, treasurer.userId)).rejects.toThrow(
        /deactivate yourself/,
      );
      await expect(users.deactivateTenantUser(tenantId, admin.id, admin.userId)).rejects.toThrow(
        /deactivate yourself/,
      );
    });

    it('a treasurer cannot deactivate an administrator; an administrator can', async () => {
      await expect(users.deactivateTenantUser(tenantId, member2.id, treasurer.userId)).rejects.toThrow(
        /Only a cooperative administrator/,
      );
      await users.deactivateTenantUser(tenantId, member2.id, admin.userId);
      await users.reactivateTenantUser(tenantId, member2.id, admin.userId);
    });

    it('cannot reach into another cooperative', async () => {
      await expect(users.deactivateTenantUser(otherTenantId, member1.id, admin.userId)).rejects.toThrow();
    });

    it('someone who never accepted their invitation cannot be "reactivated" into the cooperative', async () => {
      const pending = await addMember('govpending', 'member');
      await ds.getRepository(TenantUser).update({ id: pending.id }, { isActive: false, status: 'invited' });
      await expect(users.reactivateTenantUser(tenantId, pending.id, admin.userId)).rejects.toThrow(
        /hasn't accepted their invitation/,
      );
      await expect(users.deactivateTenantUser(tenantId, pending.id, admin.userId)).rejects.toThrow(
        /hasn't accepted their invitation/,
      );
      const row = await ds.getRepository(TenantUser).findOneOrFail({ where: { id: pending.id } });
      expect(row.isActive).toBe(false);
      expect(row.status).toBe('invited');
    });
  });

  describe('creating a member with roles already attached', () => {
    // The same authority as changing roles, through a different door.
    const newPerson = (n: string) => ({
      firstName: n,
      lastName: 'Tester',
      email: email(n),
      mobile: `+2665200${String(++mobileCounter).padStart(4, '0')}`,
    });

    it('a treasurer cannot create an administrator by appointing staff', async () => {
      const dto = { ...newPerson('newadmin1'), roleIds: [await roleId('tenant_admin')] };
      await expect(users.createTenantUser(tenantId, dto, treasurer.userId)).rejects.toThrow(
        /Only a cooperative administrator/,
      );
      // …and nothing was half-created.
      expect(await ds.getRepository(User).count({ where: { email: email('newadmin1') } })).toBe(0);
    });

    it('…nor with a temporary-password account', async () => {
      const dto = { ...newPerson('newadmin2'), temporaryPassword: 'a-long-temp-pw', roleIds: [await roleId('tenant_admin')] };
      await expect(
        users.createWithTemporaryPassword({ tenantId, actorUserId: treasurer.userId, dto }),
      ).rejects.toThrow(/Only a cooperative administrator/);
      expect(await ds.getRepository(User).count({ where: { email: email('newadmin2') } })).toBe(0);
    });

    it('…nor by invitation', async () => {
      const dto = { ...newPerson('newadmin3'), roleIds: [await roleId('tenant_admin')] };
      await expect(
        invitations.inviteTenantUser({ tenantId, actorUserId: treasurer.userId, dto }),
      ).rejects.toThrow(/Only a cooperative administrator/);
      expect(await ds.getRepository(User).count({ where: { email: email('newadmin3') } })).toBe(0);
    });

    it('a treasurer can still appoint someone to an ordinary role', async () => {
      const dto = { ...newPerson('newstaff1'), roleIds: [await roleId('secretary')] };
      const created = await users.createTenantUser(tenantId, dto, treasurer.userId);
      expect(created.roles.map((r: any) => r.role.code)).toEqual(['secretary']);
    });

    it('an administrator can appoint an administrator', async () => {
      const dto = { ...newPerson('newadmin4'), roleIds: [await roleId('tenant_admin')] };
      const created = await users.createTenantUser(tenantId, dto, admin.userId);
      expect(created.roles.map((r: any) => r.role.code)).toEqual(['tenant_admin']);
    });
  });

  describe('serialised per cooperative', () => {
    // These are what the lock is FOR: if two of these ran side by side,
    // each could judge "another administrator exists" from a snapshot the
    // other is about to invalidate.
    it('a role change waits for the cooperative lock', async () => {
      const secretary = await roleId('secretary');
      expect(
        await finishesWhileLockIsHeld(() => roles.assignRoles(tenantId, member1.id, [secretary], treasurer.userId)),
      ).toBe(false);
      expect(await codesOf(member1.id)).toEqual(['member', 'secretary']); // …and then it went through
      await roles.revokeRoles(tenantId, member1.id, [secretary], treasurer.userId);
    });

    it('a deactivation waits for the cooperative lock', async () => {
      expect(
        await finishesWhileLockIsHeld(() => users.deactivateTenantUser(tenantId, member3.id, treasurer.userId)),
      ).toBe(false);
      const row = await ds.getRepository(TenantUser).findOneOrFail({ where: { id: member3.id } });
      expect(row.isActive).toBe(false);
    });

    it('a reactivation waits for the cooperative lock', async () => {
      expect(
        await finishesWhileLockIsHeld(() => users.reactivateTenantUser(tenantId, member3.id, treasurer.userId)),
      ).toBe(false);
      const row = await ds.getRepository(TenantUser).findOneOrFail({ where: { id: member3.id } });
      expect(row.isActive).toBe(true);
    });
  });

  describe('editing a name', () => {
    it('finds the member by their membership id (it used to look up the wrong id)', async () => {
      const result = await users.updateTenantUser(
        tenantId,
        member1.id,
        { firstName: '  Palesa ', lastName: 'Nkosi' },
        treasurer.userId,
      );
      expect(result.user.firstName).toBe('Palesa');
      expect(result.user.lastName).toBe('Nkosi');
      const saved = await ds.getRepository(User).findOneOrFail({ where: { id: member1.userId } });
      expect(saved.firstName).toBe('Palesa');
    });

    it('does not touch whether the membership is active', async () => {
      const row = await ds.getRepository(TenantUser).findOneOrFail({ where: { id: member1.id } });
      expect(row.isActive).toBe(true);
      expect(row.status).toBe('active');
    });

    it('is refused while the person also belongs to another cooperative', async () => {
      expect(await users.isIdentityShared(tenantId, member1.userId)).toBe(false);

      await ds
        .getRepository(TenantUser)
        .save(ds.getRepository(TenantUser).create({ tenantId: otherTenantId, userId: member1.userId, isActive: true }));

      expect(await users.isIdentityShared(tenantId, member1.userId)).toBe(true);
      await expect(
        users.updateTenantUser(tenantId, member1.id, { firstName: 'Changed' }, treasurer.userId),
      ).rejects.toThrow(/belongs to other cooperatives/);
    });
  });

  describe('scheme names on a single member', () => {
    it('a member in no scheme gets an empty list', async () => {
      expect(await users.getActiveSchemeNames(tenantId, member1.id)).toEqual([]);
    });
  });
});
