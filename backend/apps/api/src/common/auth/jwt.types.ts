/**
 * Single source of truth for every JWT payload shape this app issues —
 * previously duplicated between here and a local interface inside
 * auth.service.ts, which had silently drifted out of sync (that copy
 * had `tokenType`, this one didn't, so JwtStrategy could never actually
 * check it). Unified into one type, imported everywhere a payload is
 * signed or validated.
 */
export type TokenType = "access" | "refresh" | "pre_auth";

export interface AuthJwtPayload {
  sub: string;
  tokenType: TokenType;
  /**
   * Only present on "access" and "refresh" tokens — a "pre_auth" token
   * (issued after password verification but before a tenant has been
   * chosen) deliberately carries none of these, so it can't be mistaken
   * for, or misused as, a real session token anywhere else in the app.
   */
  tenantId?: string;
  tenantSlug?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

/** Kept as an alias for existing imports — same shape, no behavior change. */
export type AccessTokenPayload = AuthJwtPayload;

/**
 * The object Passport will attach to req.user after validation.
 * (Often identical to payload; separated for flexibility.)
 */
export type AuthenticatedUser = AuthJwtPayload;
