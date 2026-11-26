/**
 * The rules for changing who a member is and what they may do: roles,
 * deactivation. Pure functions over facts — no database, no framework —
 * so every rule is testable in isolation and the services only have to
 * gather the facts honestly. The facts come from the database inside the
 * same transaction, never from the caller's token: a token can be up to
 * 15 minutes stale, and these are exactly the decisions where stale
 * authority matters.
 *
 * Why these rules exist (each one closes a real hole):
 *  - Treasurers hold `user:assign-role`. Without the administrator rule a
 *    treasurer could make themselves an administrator.
 *  - Without the self rule nobody ever has a second pair of eyes on their
 *    own access — the same principle as "you can't approve your own request".
 *  - Without the last-administrator rule a cooperative can lock itself out
 *    of its own governance, and only a database edit brings it back.
 */

export const ADMIN_ROLE_CODE = 'tenant_admin';

export const ADMIN_ROLE_LOCKED_REASON =
  'Only a cooperative administrator can give or remove this role.';

/**
 * What kind of refusal this is, so the caller can map it to the right
 * HTTP status without parsing text: `forbidden` (not yours to do),
 * `invalid` (the request itself is wrong), `conflict` (it would leave the
 * cooperative in a state it must never be in).
 */
export type ViolationKind = 'forbidden' | 'invalid' | 'conflict';

export type ViolationCode =
  | 'SELF_ROLES'
  | 'ADMIN_ROLE_ADMIN_ONLY'
  | 'NO_ROLE_LEFT'
  | 'LAST_ADMIN'
  | 'SELF_DEACTIVATE'
  | 'ADMIN_DEACTIVATE_ADMIN_ONLY'
  | 'ALREADY_DEACTIVATED'
  | 'NOT_DEACTIVATED'
  | 'NOT_JOINED_YET';

export interface RuleViolation {
  kind: ViolationKind;
  code: ViolationCode;
  /** Plain language — shown to the person as-is. */
  message: string;
}

export interface RoleChangeFacts {
  actorTenantUserId: string;
  targetTenantUserId: string;
  actorRoleCodes: readonly string[];
  targetCurrentRoleCodes: readonly string[];
  targetNextRoleCodes: readonly string[];
  targetIsActive: boolean;
  /** Active administrators in this cooperative, not counting the target. */
  otherActiveAdmins: number;
}

export function checkRoleChange(facts: RoleChangeFacts): RuleViolation | null {
  if (facts.actorTenantUserId === facts.targetTenantUserId) {
    return {
      kind: 'forbidden',
      code: 'SELF_ROLES',
      message: "You can't change your own roles. Ask another administrator to do it.",
    };
  }

  if (facts.targetNextRoleCodes.length === 0) {
    return {
      kind: 'invalid',
      code: 'NO_ROLE_LEFT',
      message:
        'Everyone needs at least one role. To take someone out of the cooperative, deactivate them instead.',
    };
  }

  const hadAdmin = facts.targetCurrentRoleCodes.includes(ADMIN_ROLE_CODE);
  const willHaveAdmin = facts.targetNextRoleCodes.includes(ADMIN_ROLE_CODE);
  const actorIsAdmin = facts.actorRoleCodes.includes(ADMIN_ROLE_CODE);

  if (hadAdmin !== willHaveAdmin && !actorIsAdmin) {
    return {
      kind: 'forbidden',
      code: 'ADMIN_ROLE_ADMIN_ONLY',
      message: 'Only a cooperative administrator can give or remove the administrator role.',
    };
  }

  // Taking the role from someone who isn't active doesn't reduce the
  // number of administrators who can actually act.
  if (hadAdmin && !willHaveAdmin && facts.targetIsActive && facts.otherActiveAdmins === 0) {
    return {
      kind: 'conflict',
      code: 'LAST_ADMIN',
      message: 'The cooperative must always have at least one active administrator.',
    };
  }

  return null;
}

/**
 * The roles a NEW member is created with — appointing staff, inviting,
 * a temporary-password account. These are a second door to the same
 * authority as changing roles, so the same rule applies: only an
 * administrator can create an administrator. (Without it, a treasurer,
 * who may create users, could simply create a new administrator.)
 */
export function checkInitialRoles(facts: {
  actorRoleCodes: readonly string[];
  grantedRoleCodes: readonly string[];
}): RuleViolation | null {
  if (
    facts.grantedRoleCodes.includes(ADMIN_ROLE_CODE) &&
    !facts.actorRoleCodes.includes(ADMIN_ROLE_CODE)
  ) {
    return {
      kind: 'forbidden',
      code: 'ADMIN_ROLE_ADMIN_ONLY',
      message: 'Only a cooperative administrator can give or remove the administrator role.',
    };
  }
  return null;
}

export interface DeactivationFacts {
  actorTenantUserId: string;
  targetTenantUserId: string;
  actorRoleCodes: readonly string[];
  targetRoleCodes: readonly string[];
  targetIsActive: boolean;
  /** 'invited' means they have never accepted — there is nothing to deactivate. */
  targetStatus?: string | null;
  /** Active administrators in this cooperative, not counting the target. */
  otherActiveAdmins: number;
}

export function checkDeactivation(facts: DeactivationFacts): RuleViolation | null {
  if (facts.actorTenantUserId === facts.targetTenantUserId) {
    return {
      kind: 'forbidden',
      code: 'SELF_DEACTIVATE',
      message: "You can't deactivate yourself. Ask another administrator to do it.",
    };
  }

  if (!facts.targetIsActive && facts.targetStatus === 'invited') {
    return {
      kind: 'invalid',
      code: 'NOT_JOINED_YET',
      message: "This person hasn't accepted their invitation yet, so there is nothing to deactivate.",
    };
  }

  if (!facts.targetIsActive) {
    return {
      kind: 'invalid',
      code: 'ALREADY_DEACTIVATED',
      message: 'This member is already deactivated.',
    };
  }

  const targetIsAdmin = facts.targetRoleCodes.includes(ADMIN_ROLE_CODE);

  if (targetIsAdmin && !facts.actorRoleCodes.includes(ADMIN_ROLE_CODE)) {
    return {
      kind: 'forbidden',
      code: 'ADMIN_DEACTIVATE_ADMIN_ONLY',
      message: 'Only a cooperative administrator can deactivate an administrator.',
    };
  }

  if (targetIsAdmin && facts.otherActiveAdmins === 0) {
    return {
      kind: 'conflict',
      code: 'LAST_ADMIN',
      message: 'The cooperative must always have at least one active administrator.',
    };
  }

  return null;
}

export function checkReactivation(target: {
  isActive: boolean;
  status?: string | null;
}): RuleViolation | null {
  if (target.isActive) {
    return {
      kind: 'invalid',
      code: 'NOT_DEACTIVATED',
      message: 'This member is already active.',
    };
  }
  // Never accepted their invitation: switching them on here would skip
  // the acceptance the invitation exists to get.
  if (target.status === 'invited') {
    return {
      kind: 'invalid',
      code: 'NOT_JOINED_YET',
      message: "This person hasn't accepted their invitation yet, so there is nothing to reactivate.",
    };
  }
  return null;
}

/** The order roles are shown in: most authority first, then the rest by name. */
export const ROLE_DISPLAY_ORDER = ['tenant_admin', 'treasurer', 'secretary', 'member'];

export function compareRolesForDisplay(
  a: { code: string; name: string },
  b: { code: string; name: string },
): number {
  const ia = ROLE_DISPLAY_ORDER.indexOf(a.code);
  const ib = ROLE_DISPLAY_ORDER.indexOf(b.code);
  const rankA = ia === -1 ? ROLE_DISPLAY_ORDER.length : ia;
  const rankB = ib === -1 ? ROLE_DISPLAY_ORDER.length : ib;
  return rankA - rankB || a.name.localeCompare(b.name);
}
