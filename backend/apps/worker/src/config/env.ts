/**
 * getRequiredEnv fails loudly and immediately if a required environment
 * variable is missing, instead of silently falling back to an insecure
 * default.
 *
 * NOTE: this is intentionally duplicated from apps/api/src/config/env.ts
 * rather than imported across the app boundary. Cross-app relative imports
 * (e.g. '../../api/src/...') break TypeScript's build output structure for
 * this monorepo — see the comment in apps/worker/tsconfig.app.json. The
 * proper long-term fix is moving genuinely shared code into libs/common
 * with a build step that rewrites path aliases (e.g. tsc-alias); that's a
 * deliberate, testable change for its own session, not a quick patch.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. Refusing to start ` +
        `with an insecure default — set ${name} in the environment.`,
    );
  }

  return value;
}