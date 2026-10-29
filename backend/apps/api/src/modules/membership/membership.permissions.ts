/**
 * Who may invite people, and who may decide on them, are two separate
 * permissions — not one "admin" switch — so a cooperative can later
 * choose to let, say, a secretary invite without being able to approve.
 * By default both go to tenant_admin and treasurer, exactly as before.
 */
export const MEMBERSHIP_PERMISSIONS = {
  /** Create invite links. */
  INVITE: "membership:invite",
  /** See the queue of people asking to join, and approve or decline them. */
  APPROVE: "membership:approve",
} as const;
