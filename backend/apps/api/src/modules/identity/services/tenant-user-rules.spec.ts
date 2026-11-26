import {
  ADMIN_ROLE_CODE,
  checkDeactivation,
  checkInitialRoles,
  checkReactivation,
  checkRoleChange,
  compareRolesForDisplay,
  DeactivationFacts,
  RoleChangeFacts,
} from './tenant-user-rules';

const roleChange = (over: Partial<RoleChangeFacts> = {}): RoleChangeFacts => ({
  actorTenantUserId: 'actor',
  targetTenantUserId: 'target',
  actorRoleCodes: [ADMIN_ROLE_CODE],
  targetCurrentRoleCodes: ['member'],
  targetNextRoleCodes: ['member', 'secretary'],
  targetIsActive: true,
  otherActiveAdmins: 1,
  ...over,
});

const deactivation = (over: Partial<DeactivationFacts> = {}): DeactivationFacts => ({
  actorTenantUserId: 'actor',
  targetTenantUserId: 'target',
  actorRoleCodes: ['treasurer'],
  targetRoleCodes: ['member'],
  targetIsActive: true,
  otherActiveAdmins: 1,
  ...over,
});

describe('checkRoleChange', () => {
  it('allows an ordinary change', () => {
    expect(checkRoleChange(roleChange())).toBeNull();
  });

  it('refuses changing your own roles, even for an administrator', () => {
    const v = checkRoleChange(roleChange({ targetTenantUserId: 'actor' }));
    expect(v).toMatchObject({ kind: 'forbidden', code: 'SELF_ROLES' });
  });

  it('refuses leaving someone with no role, and says to deactivate instead', () => {
    const v = checkRoleChange(roleChange({ targetNextRoleCodes: [] }));
    expect(v).toMatchObject({ kind: 'invalid', code: 'NO_ROLE_LEFT' });
    expect(v?.message).toMatch(/deactivate/);
  });

  describe('the administrator role', () => {
    it('a treasurer cannot give it to anyone', () => {
      const v = checkRoleChange(
        roleChange({
          actorRoleCodes: ['treasurer'],
          targetNextRoleCodes: ['member', ADMIN_ROLE_CODE],
        }),
      );
      expect(v).toMatchObject({ kind: 'forbidden', code: 'ADMIN_ROLE_ADMIN_ONLY' });
    });

    it('a treasurer cannot take it away either', () => {
      const v = checkRoleChange(
        roleChange({
          actorRoleCodes: ['treasurer'],
          targetCurrentRoleCodes: ['member', ADMIN_ROLE_CODE],
          targetNextRoleCodes: ['member'],
        }),
      );
      expect(v).toMatchObject({ code: 'ADMIN_ROLE_ADMIN_ONLY' });
    });

    it('a treasurer can still change other roles of someone who is an administrator', () => {
      const v = checkRoleChange(
        roleChange({
          actorRoleCodes: ['treasurer'],
          targetCurrentRoleCodes: [ADMIN_ROLE_CODE],
          targetNextRoleCodes: [ADMIN_ROLE_CODE, 'treasurer'],
        }),
      );
      expect(v).toBeNull();
    });

    it('an administrator can give it', () => {
      expect(
        checkRoleChange(roleChange({ targetNextRoleCodes: ['member', ADMIN_ROLE_CODE] })),
      ).toBeNull();
    });
  });

  describe('the last administrator', () => {
    const demote = (over: Partial<RoleChangeFacts> = {}) =>
      roleChange({
        targetCurrentRoleCodes: [ADMIN_ROLE_CODE],
        targetNextRoleCodes: ['member'],
        ...over,
      });

    it('cannot be demoted', () => {
      const v = checkRoleChange(demote({ otherActiveAdmins: 0 }));
      expect(v).toMatchObject({ kind: 'conflict', code: 'LAST_ADMIN' });
    });

    it('can be demoted when another active administrator exists', () => {
      expect(checkRoleChange(demote({ otherActiveAdmins: 1 }))).toBeNull();
    });

    it('does not block demoting an administrator who is already deactivated', () => {
      expect(checkRoleChange(demote({ otherActiveAdmins: 0, targetIsActive: false }))).toBeNull();
    });
  });
});

describe('checkDeactivation', () => {
  it('lets a treasurer deactivate an ordinary member', () => {
    expect(checkDeactivation(deactivation())).toBeNull();
  });

  it('refuses deactivating yourself', () => {
    const v = checkDeactivation(deactivation({ targetTenantUserId: 'actor' }));
    expect(v).toMatchObject({ kind: 'forbidden', code: 'SELF_DEACTIVATE' });
  });

  it('says so plainly when the person never accepted their invitation', () => {
    const v = checkDeactivation(deactivation({ targetIsActive: false, targetStatus: 'invited' }));
    expect(v).toMatchObject({ kind: 'invalid', code: 'NOT_JOINED_YET' });
  });

  it('refuses deactivating someone who already is', () => {
    const v = checkDeactivation(deactivation({ targetIsActive: false }));
    expect(v).toMatchObject({ kind: 'invalid', code: 'ALREADY_DEACTIVATED' });
  });

  it('only an administrator may deactivate an administrator', () => {
    const v = checkDeactivation(
      deactivation({ actorRoleCodes: ['treasurer'], targetRoleCodes: [ADMIN_ROLE_CODE] }),
    );
    expect(v).toMatchObject({ kind: 'forbidden', code: 'ADMIN_DEACTIVATE_ADMIN_ONLY' });
  });

  it('an administrator may deactivate another administrator while one remains', () => {
    expect(
      checkDeactivation(
        deactivation({ actorRoleCodes: [ADMIN_ROLE_CODE], targetRoleCodes: [ADMIN_ROLE_CODE] }),
      ),
    ).toBeNull();
  });

  it('never the last active administrator', () => {
    const v = checkDeactivation(
      deactivation({
        actorRoleCodes: [ADMIN_ROLE_CODE],
        targetRoleCodes: [ADMIN_ROLE_CODE],
        otherActiveAdmins: 0,
      }),
    );
    expect(v).toMatchObject({ kind: 'conflict', code: 'LAST_ADMIN' });
  });
});

describe('checkInitialRoles (creating a member with roles already attached)', () => {
  it('lets anyone who may create users attach ordinary roles', () => {
    expect(
      checkInitialRoles({ actorRoleCodes: ['treasurer'], grantedRoleCodes: ['member', 'secretary'] }),
    ).toBeNull();
  });
  it('a treasurer cannot create an administrator', () => {
    expect(
      checkInitialRoles({ actorRoleCodes: ['treasurer'], grantedRoleCodes: [ADMIN_ROLE_CODE] }),
    ).toMatchObject({ kind: 'forbidden', code: 'ADMIN_ROLE_ADMIN_ONLY' });
  });
  it('an administrator can', () => {
    expect(
      checkInitialRoles({ actorRoleCodes: [ADMIN_ROLE_CODE], grantedRoleCodes: [ADMIN_ROLE_CODE] }),
    ).toBeNull();
  });
});

describe('checkReactivation', () => {
  it('allows reactivating a deactivated member', () => {
    expect(checkReactivation({ isActive: false, status: 'suspended' })).toBeNull();
  });
  it('refuses reactivating someone who is already active', () => {
    expect(checkReactivation({ isActive: true, status: 'active' })).toMatchObject({ code: 'NOT_DEACTIVATED' });
  });
  it('refuses "reactivating" someone who never accepted their invitation', () => {
    expect(checkReactivation({ isActive: false, status: 'invited' })).toMatchObject({
      kind: 'invalid',
      code: 'NOT_JOINED_YET',
    });
  });
});

describe('compareRolesForDisplay', () => {
  it('puts the well-known roles in authority order and the rest by name', () => {
    const roles = [
      { code: 'member', name: 'Member' },
      { code: 'auditor', name: 'Auditor' },
      { code: 'tenant_admin', name: 'Tenant Administrator' },
      { code: 'chair', name: 'Chairperson' },
      { code: 'treasurer', name: 'Treasurer' },
    ];
    expect(roles.sort(compareRolesForDisplay).map((r) => r.code)).toEqual([
      'tenant_admin',
      'treasurer',
      'member',
      'auditor',
      'chair',
    ]);
  });
});
