import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';
import { TenantContextService } from './tenant-context.service';

/**
 * This is the single most important test in the hardening pass: it proves
 * that a request carrying one tenant's JWT cannot be used to read or write
 * another tenant's data by supplying a different X-Tenant-Id header. For a
 * multi-tenant financial platform, this is the line between "cooperatives
 * safely share infrastructure" and "cooperative A can see cooperative B's
 * money."
 */
describe('TenantGuard - cross-tenant isolation', () => {
  let guard: TenantGuard;
  let tenantContext: TenantContextService;
  let reflector: Reflector;

  const buildContext = (options: {
    headers: Record<string, string | undefined>;
    user?: { id: string; tenantId: string; permissions: string[] };
    isPublic?: boolean;
  }): ExecutionContext => {
    const request = {
      headers: options.headers,
      user: options.user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    tenantContext = new TenantContextService();
    reflector = new Reflector();
    guard = new TenantGuard(tenantContext, reflector);
  });

  it('blocks a request whose JWT tenantId does not match the X-Tenant-Id header (cross-tenant attempt)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const ctx = buildContext({
      headers: { 'x-tenant-id': 'tenant-B' },
      user: { id: 'user-1', tenantId: 'tenant-A', permissions: [] },
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(/does not match/i);
  });

  it('allows a request when the JWT tenantId matches the X-Tenant-Id header', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const ctx = buildContext({
      headers: { 'x-tenant-id': 'tenant-A' },
      user: { id: 'user-1', tenantId: 'tenant-A', permissions: [] },
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(tenantContext.getTenantId()).toBe('tenant-A');
  });

  it('rejects a request missing the X-Tenant-Id header entirely', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const ctx = buildContext({
      headers: {},
      user: { id: 'user-1', tenantId: 'tenant-A', permissions: [] },
    });

    expect(() => guard.canActivate(ctx)).toThrow(/Missing X-Tenant-Id/i);
  });

  it('fails closed if req.user is missing on a non-public route (defensive — should never happen if guard order is correct)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const ctx = buildContext({
      headers: { 'x-tenant-id': 'tenant-A' },
      user: undefined,
    });

    expect(() => guard.canActivate(ctx)).toThrow(/not authenticated/i);
  });

  it('allows public routes through without a tenant header at all', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const ctx = buildContext({ headers: {} });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
