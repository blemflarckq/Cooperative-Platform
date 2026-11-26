/** The role that governs the cooperative. Matches the server's rule. */
export const ADMIN_ROLE_CODE = "tenant_admin";

/**
 * How soon a role change or a deactivation reaches the person's open
 * session. Permissions travel in a short-lived sign-in token that is
 * renewed from the server, so a change lands the next time it renews —
 * at most 15 minutes. One place so the copy and the truth move together.
 */
export const CHANGE_REACHES_THEM = "within about 15 minutes";
