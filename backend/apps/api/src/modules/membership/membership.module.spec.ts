import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

/**
 * A wiring smoke test, not a behaviour test: it asks Nest to build the
 * real MembershipModule graph against a stubbed database and confirms
 * every dependency resolves. This is the failure class a compile can't
 * catch — e.g. MembershipController needing AuthService while
 * CommonModule doesn't export it — and which otherwise only shows up as
 * the server refusing to boot.
 */
// @nestjs/schedule ships as ESM, which this jest setup doesn't transform.
// The wiring under test doesn't depend on the scheduler itself, only on
// the decorator existing, so it's stubbed out here.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_HOUR: '0 0-23/1 * * *' },
}));

const stubRepository = () => ({});
const stubDataSource = {
  options: { type: 'postgres' },
  getRepository: stubRepository,
  manager: { getRepository: stubRepository },
  entityMetadatas: [],
  transaction: jest.fn(),
};

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: stubDataSource }],
  exports: [DataSource],
})
class StubDatabaseModule {}

describe('MembershipModule wiring', () => {
  it('resolves every dependency, including AuthService from CommonModule', async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

    // require, not import(): the env vars above must exist before
    // CommonModule is evaluated (it reads JWT_ACCESS_SECRET at load time),
    // and this jest setup doesn't support dynamic import().
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
    const { MembershipModule } = require('./membership.module');
    const { MembershipController } = require('./controllers/membership.controller');
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

    const moduleRef = await Test.createTestingModule({
      imports: [StubDatabaseModule, MembershipModule],
    }).compile();

    expect(moduleRef.get(MembershipController)).toBeDefined();
  });
});
