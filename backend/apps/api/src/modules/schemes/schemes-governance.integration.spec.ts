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
 * Scheme governance against a real Postgres: what may be edited after
 * activation, the lifecycle transitions, what blocks an archive, and
 * that a suspended scheme really stops new money, loan requests, members
 * and cycles — while winding down (pause, close, repay) stays possible.
 *
 * OFF by default, like the other integration tests: it needs a scratch
 * database whose name ends in "_it" (it DROPS the schema first):
 *
 *   createdb coop_gov_it
 *   ENROLLMENT_IT_DATABASE_URL=postgres://user:pass@localhost:5432/coop_gov_it \
 *     npx jest schemes-governance.integration
 */
const dbUrl = process.env.ENROLLMENT_IT_DATABASE_URL;
if (dbUrl && !/\/[^/?]*_it(\?|$)/.test(dbUrl)) {
  throw new Error(
    'Refusing to run: this test DROPS the whole schema, so the database name must end in "_it".',
  );
}
const describeIfEnabled = dbUrl ? describe : describe.skip;

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
describeIfEnabled('scheme governance against a real Postgres', () => {
  let ds: DataSource;
  let auth: any;
  let schemes: any; // SchemesService
  let cycles: any; // OperatingCyclesService
  let participants: any; // CycleParticipantsService
  let contributions: any; // ContributionsService
  let loans: any; // LoansService
  let Loan: any, TenantUser: any, OutboxEvent: any;
  let lockScheme: any, assertSchemeAcceptsNewActivity: any;
  let SchemeStatus: any, LoanStatus: any, AtCapBehavior: any;

  let tenantId: string;
  let adminUserId: string;
  let memberTuId: string;
  let counter = 0;

  const PASSWORD = 'correct-horse-9';
  const reg = (n: string) =>
    auth.register({
      firstName: n,
      lastName: 'Tester',
      email: `${n}@example.test`,
      mobile: `+2665200${String(++counter).padStart(4, '0')}`,
      password: PASSWORD,
    });

  const modes = (over: Record<string, string> = {}) => ({
    contributionMode: 'MONTHLY_FIXED',
    cycleMode: 'OPEN_ENDED',
    loanMode: 'SELF_BACKED',
    payoutMode: 'NO_PAYOUT',
    ...over,
  });

  const newScheme = (name: string, over: Record<string, string> = {}) =>
    schemes.create(tenantId, { name, ...modes(over) }, adminUserId);

  const events = (aggregateId: string, type: string) =>
    ds.getRepository(OutboxEvent).count({ where: { aggregateId, eventType: type } });

  /** Inserts a loan row directly — the loan lifecycle has its own tests; here only its status matters. */
  async function insertLoan(schemeId: string, cycleId: string, status: string) {
    return ds.getRepository(Loan).save(
      ds.getRepository(Loan).create({
        tenantId,
        schemeId,
        cycleId,
        borrowerTenantUserId: memberTuId,
        principalAmount: '100.00',
        selfFundedMonthlyRate: '1.00',
        currentPeerMonthlyRate: '2.00',
        peerMonthlyRateIncrement: '0.50',
        peerCapRate: '5.00',
        atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
        purpose: 'test',
        status,
      } as any),
    );
  }

  /** An active scheme with one open cycle. */
  async function activeSchemeWithOpenCycle(name: string, over: Record<string, string> = {}) {
    const scheme = await newScheme(name, over);
    await schemes.activate(tenantId, scheme.id, adminUserId);
    const cycle = await cycles.createForScheme(
      tenantId,
      scheme.id,
      { name: `${name} cycle`, code: 'c1' },
      adminUserId,
    );
    await cycles.open(tenantId, cycle.id, adminUserId);
    return { scheme, cycle };
  }

  /** Holds `lock` on the scheme in a transaction of the test's own and reports whether `operation` finished meanwhile. */
  async function finishesWhileLockIsHeld(
    schemeId: string,
    mode: 'write' | 'read',
    operation: () => Promise<unknown>,
  ): Promise<boolean> {
    const holder = ds.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await lockScheme(holder.manager, tenantId, schemeId, mode);

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
    const { SchemesModule } = require('./schemes.module');
    const { PaymentsModule } = require('../payments/payments.module');
    const { AuthService } = require('../../common/auth/auth.service');
    const { SchemesService } = require('./services/schemes.service');
    const { OperatingCyclesService } = require('./services/operating-cycles.service');
    const { CycleParticipantsService } = require('./services/cycle-participants.service');
    const { ContributionsService } = require('../accounting/services/contributions.service');
    const { LoansService } = require('../loans/services/loans.service');
    ({ Loan } = require('../loans/entities/loan.entity'));
    ({ LoanStatus, AtCapBehavior } = require('../loans/enums/loan.enums'));
    ({ TenantUser } = require('../identity/entities/tenant-user.entity'));
    ({ OutboxEvent } = require('../../common/messaging/outbox-event.entity'));
    ({ SchemeStatus } = require('./enums/scheme.enums'));
    ({ lockScheme, assertSchemeAcceptsNewActivity } = require('./services/scheme-governance'));
    const { seedPermissions } = require('../../seed/permissions.seed');

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
        SchemesModule,
        PaymentsModule,
      ],
    }).compile();

    ds = moduleRef.get(DataSource);
    await seedPermissions(ds);
    auth = moduleRef.get(AuthService, { strict: false });
    schemes = moduleRef.get(SchemesService, { strict: false });
    cycles = moduleRef.get(OperatingCyclesService, { strict: false });
    participants = moduleRef.get(CycleParticipantsService, { strict: false });
    contributions = moduleRef.get(ContributionsService, { strict: false });
    loans = moduleRef.get(LoansService, { strict: false });
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  it('sets up a cooperative with an administrator and one more member', async () => {
    const r = await reg('schemeadmin');
    const session = await auth.createTenant(r.preAuthToken, 'Scheme Test Coop');
    tenantId = session.user.tenantId;
    adminUserId = session.user.id;

    const m = await reg('schememember');
    const user = await auth.loadUserFromPreAuthToken(m.preAuthToken);
    const tu = await ds
      .getRepository(TenantUser)
      .save(ds.getRepository(TenantUser).create({ tenantId, userId: user.id, isActive: true }));
    memberTuId = tu.id;
  });

  describe('editing', () => {
    it('a draft can change anything, including its modes and code', async () => {
      const s = await newScheme('Editable Draft');
      const saved = await schemes.update(
        tenantId,
        s.id,
        { loanMode: 'DISABLED', cycleMode: 'FIXED_PERIOD', code: 'draft-code' },
        adminUserId,
      );
      expect(saved.loanMode).toBe('DISABLED');
      expect(saved.cycleMode).toBe('FIXED_PERIOD');
      expect(saved.code).toBe('draft-code');
    });

    it('once activated, name and description still change', async () => {
      const s = await newScheme('Rename Me');
      await schemes.activate(tenantId, s.id, adminUserId);
      const saved = await schemes.update(
        tenantId,
        s.id,
        { name: 'Renamed', description: 'Now with words' },
        adminUserId,
      );
      expect(saved.name).toBe('Renamed');
      expect(saved.description).toBe('Now with words');
    });

    it('once activated, re-sending the same modes and code is not a change', async () => {
      const s = await newScheme('Resend Same');
      await schemes.activate(tenantId, s.id, adminUserId);
      // The edit form sends everything it was loaded with — and a code in a different spelling.
      const saved = await schemes.update(
        tenantId,
        s.id,
        { ...modes(), code: ` ${s.code.toUpperCase()} `, name: 'Resend Same 2' },
        adminUserId,
      );
      expect(saved.name).toBe('Resend Same 2');
      expect(saved.code).toBe(s.code);
    });

    it.each([
      [{ loanMode: 'DISABLED' }, /loan mode can't be changed/],
      [{ cycleMode: 'FIXED_PERIOD' }, /cycle mode can't be changed/],
      [{ payoutMode: 'END_OF_CYCLE' }, /payout mode can't be changed/],
      [{ contributionMode: 'VOLUNTARY' }, /contribution mode can't be changed/],
      [{ code: 'something-else' }, /code can't be changed/],
    ])('once activated, %j is refused with a reason', async (change, message) => {
      const s = await newScheme(`Locked ${Object.keys(change)[0]}`);
      await schemes.activate(tenantId, s.id, adminUserId);
      await expect(schemes.update(tenantId, s.id, change, adminUserId)).rejects.toThrow(message);
      const unchanged = await schemes.findOne(tenantId, s.id);
      expect(unchanged.loanMode).toBe('SELF_BACKED');
    });

    it('a refused edit changes nothing at all, not even the name sent with it', async () => {
      const s = await newScheme('All Or Nothing');
      await schemes.activate(tenantId, s.id, adminUserId);
      await expect(
        schemes.update(tenantId, s.id, { name: 'Sneaky', loanMode: 'DISABLED' }, adminUserId),
      ).rejects.toThrow();
      expect((await schemes.findOne(tenantId, s.id)).name).toBe('All Or Nothing');
    });

    it('a suspended scheme is locked the same way', async () => {
      const s = await newScheme('Suspended Lock');
      await schemes.activate(tenantId, s.id, adminUserId);
      await schemes.suspend(tenantId, s.id, adminUserId);
      await expect(schemes.update(tenantId, s.id, { loanMode: 'DISABLED' }, adminUserId)).rejects.toThrow(
        /can't be changed once a scheme has been activated/,
      );
    });

    it('an archived scheme cannot be edited at all', async () => {
      const s = await newScheme('Archived Edit');
      await schemes.archive(tenantId, s.id, adminUserId);
      await expect(schemes.update(tenantId, s.id, { name: 'Nope' }, adminUserId)).rejects.toThrow(
        /Archived schemes cannot be updated/,
      );
    });

    it('two schemes cannot end up with the same name', async () => {
      await newScheme('Taken Name');
      const other = await newScheme('Other Name');
      await expect(schemes.update(tenantId, other.id, { name: 'Taken Name' }, adminUserId)).rejects.toThrow(
        /already exists/,
      );
    });
  });

  describe('lifecycle', () => {
    it('activate, suspend and resume each announce themselves once', async () => {
      const s = await newScheme('Lifecycle');
      await schemes.activate(tenantId, s.id, adminUserId);
      await schemes.suspend(tenantId, s.id, adminUserId);
      const resumed = await schemes.activate(tenantId, s.id, adminUserId);

      expect(resumed.status).toBe('ACTIVE');
      expect(resumed.isActive).toBe(true);
      expect(await events(s.id, 'scheme.activated.v1')).toBe(2);
      expect(await events(s.id, 'scheme.suspended.v1')).toBe(1);
    });

    it('resuming keeps the original activation date', async () => {
      const s = await newScheme('Keeps Date');
      const first = await schemes.activate(tenantId, s.id, adminUserId);
      await schemes.suspend(tenantId, s.id, adminUserId);
      const resumed = await schemes.activate(tenantId, s.id, adminUserId);
      expect(resumed.activatedAt.getTime()).toBe(first.activatedAt.getTime());
    });

    it('says plainly when the scheme is already where you asked it to go', async () => {
      const s = await newScheme('Already');
      await schemes.activate(tenantId, s.id, adminUserId);
      await expect(schemes.activate(tenantId, s.id, adminUserId)).rejects.toThrow('This scheme is already active.');
    });

    it('only an active scheme can be suspended', async () => {
      const s = await newScheme('Draft Suspend');
      await expect(schemes.suspend(tenantId, s.id, adminUserId)).rejects.toThrow(
        'Only an active scheme can be suspended.',
      );
    });

    it('archiving is final', async () => {
      const s = await newScheme('Final');
      await schemes.archive(tenantId, s.id, adminUserId);
      await expect(schemes.activate(tenantId, s.id, adminUserId)).rejects.toThrow(/closed for good/);
    });

    it("another cooperative's scheme is not found", async () => {
      const o = await reg('schemeother');
      const other = await auth.createTenant(o.preAuthToken, 'Another Coop');
      const s = await newScheme('Mine');
      await expect(schemes.suspend(other.user.tenantId, s.id, other.user.id)).rejects.toThrow(/Scheme not found/);
    });
  });

  describe('archiving', () => {
    it('is allowed for a scheme with nothing running and nothing owed', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Clean Archive');
      await cycles.close(tenantId, cycle.id, adminUserId);
      const archived = await schemes.archive(tenantId, scheme.id, adminUserId);
      expect(archived.status).toBe(SchemeStatus.ARCHIVED);
      expect(archived.isActive).toBe(false);
    });

    it('is refused while a cycle is open, and says so', async () => {
      const { scheme } = await activeSchemeWithOpenCycle('Open Cycle Blocks');
      await expect(schemes.archive(tenantId, scheme.id, adminUserId)).rejects.toThrow(
        /can't be archived yet: 1 cycle is still running\. Close the cycles and settle the loans first\./,
      );
      expect((await schemes.findOne(tenantId, scheme.id)).status).toBe('ACTIVE');
    });

    it('is refused while a cycle is paused', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Paused Blocks');
      await cycles.pause(tenantId, cycle.id, adminUserId);
      await expect(schemes.archive(tenantId, scheme.id, adminUserId)).rejects.toThrow(/1 cycle is still running/);
    });

    it('is not blocked by a draft cycle, which can no longer be opened afterwards', async () => {
      const scheme = await newScheme('Draft Cycle');
      await schemes.activate(tenantId, scheme.id, adminUserId);
      const cycle = await cycles.createForScheme(tenantId, scheme.id, { name: 'Draft one', code: 'd1' }, adminUserId);
      await schemes.archive(tenantId, scheme.id, adminUserId);
      await expect(cycles.open(tenantId, cycle.id, adminUserId)).rejects.toThrow(/archived/);
    });

    it('is refused while any loan is unpaid — including one still awaiting approval', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Loan Blocks');
      await cycles.close(tenantId, cycle.id, adminUserId);
      for (const status of [
        LoanStatus.PENDING_PLEDGES,
        LoanStatus.PENDING_APPROVAL,
        LoanStatus.ACTIVE,
        LoanStatus.AT_RISK,
      ]) {
        const loan = await insertLoan(scheme.id, cycle.id, status);
        await expect(schemes.archive(tenantId, scheme.id, adminUserId)).rejects.toThrow(
          /1 loan isn't fully repaid/,
        );
        await ds.getRepository(Loan).delete({ id: loan.id });
      }
    });

    it('says everything in the way at once', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Both Block');
      await insertLoan(scheme.id, cycle.id, LoanStatus.ACTIVE);
      await insertLoan(scheme.id, cycle.id, LoanStatus.AT_RISK);
      await expect(schemes.archive(tenantId, scheme.id, adminUserId)).rejects.toThrow(
        /1 cycle is still running and 2 loans aren't fully repaid/,
      );
      expect(await schemes.getArchiveBlockers(tenantId, scheme.id)).toEqual({ runningCycles: 1, unpaidLoans: 2 });
    });

    it('once the cycle is closed and the loan repaid, it goes through', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Settled');
      await insertLoan(scheme.id, cycle.id, LoanStatus.REPAID);
      await cycles.close(tenantId, cycle.id, adminUserId);
      expect(await schemes.getArchiveBlockers(tenantId, scheme.id)).toEqual({ runningCycles: 0, unpaidLoans: 0 });
      await expect(schemes.archive(tenantId, scheme.id, adminUserId)).resolves.toBeTruthy();
    });

    it("other schemes' cycles and loans don't count", async () => {
      await activeSchemeWithOpenCycle('Busy Neighbour');
      const quiet = await newScheme('Quiet One');
      await expect(schemes.archive(tenantId, quiet.id, adminUserId)).resolves.toBeTruthy();
    });
  });

  describe('a suspended scheme', () => {
    it('takes no new members', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('No New Members');
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await expect(
        participants.enroll(tenantId, cycle.id, { tenantUserId: memberTuId }, adminUserId),
      ).rejects.toThrow(/is suspended, so it isn't taking new contributions, loan requests or members/);
      await expect(
        participants.bulkEnroll(tenantId, cycle.id, { tenantUserIds: [memberTuId] }, adminUserId),
      ).rejects.toThrow(/is suspended/);
    });

    it('takes no new contributions, even into a cycle that was left open', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('No New Money');
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await expect(
        contributions.createForCycle(tenantId, cycle.id, { tenantUserId: memberTuId, amount: '10.00' }, adminUserId),
      ).rejects.toThrow(/is suspended/);
    });

    it('proves the guard is what stops it: the same call on an active scheme gets further', async () => {
      const { cycle } = await activeSchemeWithOpenCycle('Control Group');
      // Not enrolled, so it must fail — but for a different reason than the suspension.
      const error = await contributions
        .createForCycle(tenantId, cycle.id, { tenantUserId: memberTuId, amount: '10.00' }, adminUserId)
        .catch((e: Error) => e);
      expect(error.message).not.toMatch(/suspended/);
    });

    it('takes no new loan requests', async () => {
      const { scheme } = await activeSchemeWithOpenCycle('No New Loans');
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await expect(
        loans.requestLoan(tenantId, scheme.id, { amount: '50.00', purpose: 'stock' }, adminUserId),
      ).rejects.toThrow(/is suspended/);
    });

    it('cannot start a new cycle or reopen a paused one', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('No Reopen');
      await cycles.pause(tenantId, cycle.id, adminUserId);
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await expect(cycles.open(tenantId, cycle.id, adminUserId)).rejects.toThrow(/is suspended/);
      await expect(
        cycles.createForScheme(tenantId, scheme.id, { name: 'Another', code: 'a2' }, adminUserId),
      ).rejects.toThrow(/is suspended/);
    });

    it('can still wind down: pause and close always work', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Wind Down');
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await expect(cycles.pause(tenantId, cycle.id, adminUserId)).resolves.toBeTruthy();
      await expect(cycles.close(tenantId, cycle.id, adminUserId)).resolves.toBeTruthy();
    });

    it('resumes: new members are welcome again', async () => {
      const { scheme, cycle } = await activeSchemeWithOpenCycle('Resumes');
      await schemes.suspend(tenantId, scheme.id, adminUserId);
      await schemes.activate(tenantId, scheme.id, adminUserId);
      const enrolled = await participants.enroll(tenantId, cycle.id, { tenantUserId: memberTuId }, adminUserId);
      expect(enrolled.status).toBe('ACTIVE');
    });
  });

  describe('loans', () => {
    it("a scheme whose loan mode is disabled doesn't offer them", async () => {
      const { scheme } = await activeSchemeWithOpenCycle('No Loans Here', { loanMode: 'DISABLED' });
      await expect(
        loans.requestLoan(tenantId, scheme.id, { amount: '50.00', purpose: 'stock' }, adminUserId),
      ).rejects.toThrow("This scheme doesn't offer loans.");
    });
  });

  describe('the guard itself', () => {
    it('answers for each state', async () => {
      const s = await newScheme('Guard States');
      const ask = () => ds.transaction((m) => assertSchemeAcceptsNewActivity(m, tenantId, s.id));
      await expect(ask()).rejects.toThrow(/hasn't been activated yet/);
      await schemes.activate(tenantId, s.id, adminUserId);
      await expect(ask()).resolves.toBeTruthy();
      await schemes.suspend(tenantId, s.id, adminUserId);
      await expect(ask()).rejects.toThrow(/suspended/);
      await schemes.archive(tenantId, s.id, adminUserId);
      await expect(ask()).rejects.toThrow(/archived/);
    });

    it('waits for an archive that is in progress (deterministic: the lock is held by the test)', async () => {
      const { scheme } = await activeSchemeWithOpenCycle('Waits For Archive');
      const finished = await finishesWhileLockIsHeld(scheme.id, 'write', () =>
        ds.transaction((m) => assertSchemeAcceptsNewActivity(m, tenantId, scheme.id)),
      );
      expect(finished).toBe(false);
    });

    it('an archive waits for new activity that is in flight', async () => {
      const scheme = await newScheme('Archive Waits');
      const finished = await finishesWhileLockIsHeld(scheme.id, 'read', () =>
        schemes.archive(tenantId, scheme.id, adminUserId),
      );
      expect(finished).toBe(false);
      expect((await schemes.findOne(tenantId, scheme.id)).status).toBe('ARCHIVED');
    });

    it('lots of new activity at once does not queue behind itself (shared lock)', async () => {
      const { scheme } = await activeSchemeWithOpenCycle('Shared Readers');
      const a = ds.createQueryRunner();
      await a.connect();
      await a.startTransaction();
      await lockScheme(a.manager, tenantId, scheme.id, 'read');
      const finished = await finishesWhileLockIsHeld(scheme.id, 'read', () =>
        ds.transaction((m) => assertSchemeAcceptsNewActivity(m, tenantId, scheme.id)),
      ).catch(() => false);
      await a.commitTransaction();
      await a.release();
      expect(finished).toBe(true);
    });
  });

  describe('listing', () => {
    it('searching for "%" finds a scheme with a % in its name, not every scheme', async () => {
      await newScheme('100% Fund');
      await newScheme('Plain Fund');
      const [rows] = await schemes.findAll(tenantId, { search: '%', page: 1, limit: 50 });
      expect(rows.map((r: any) => r.name)).toEqual(['100% Fund']);
    });

    it('searching for "_" does not match every single character', async () => {
      await newScheme('Under_score Fund');
      const [rows] = await schemes.findAll(tenantId, { search: '_', page: 1, limit: 50 });
      expect(rows.map((r: any) => r.name)).toEqual(['Under_score Fund']);
    });
  });
});
