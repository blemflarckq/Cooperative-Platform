/**
 * JWT payload contract for access tokens.
 * Keep it explicit so auth + RBAC is type-safe.
 */
export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * The object Passport will attach to req.user after validation.
 * (Often identical to payload; separated for flexibility.)
 */
export type AuthenticatedUser = AccessTokenPayload;