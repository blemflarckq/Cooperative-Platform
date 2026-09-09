/**
 * getRequiredEnv fails loudly and immediately if a required environment
 * variable is missing, instead of silently falling back to an insecure
 * default. This is especially important for secrets (JWT signing keys,
 * DB credentials): a missing env var in production should crash the
 * app at startup, not quietly issue tokens signed with a value anyone
 * can read in this repo's git history.
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

/**
 * For config that's genuinely optional at the app level — OAuth
 * credentials being the case that motivated this. The app must still
 * boot and serve email+password login/Setup even when nobody has
 * configured Google/Facebook OAuth yet; only actually hitting those
 * specific routes without real credentials should fail, not starting
 * the whole server.
 */
export function getOptionalEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}
