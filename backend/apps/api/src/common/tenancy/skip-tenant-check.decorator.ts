import { SetMetadata } from "@nestjs/common";

export const SKIP_TENANT_CHECK_KEY = "skip_tenant_check";

/**
 * For the narrow case of a route that genuinely needs real JWT
 * authentication (so NOT @Public()) but must not enforce "X-Tenant-Id
 * matches this token's own tenant" — accepting a membership invite
 * being exactly that case. The person accepting one may already hold a
 * session tied to a different tenant than the one they're joining; the
 * target tenant comes from the invite token itself, not from their
 * current session, so TenantGuard's normal header-must-match-JWT rule
 * would incorrectly reject a legitimate request here.
 */
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);
