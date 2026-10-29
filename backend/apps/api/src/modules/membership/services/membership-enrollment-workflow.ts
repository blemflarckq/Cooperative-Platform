import { BadRequestException } from "@nestjs/common";
import { ApprovalDecision } from "../../schemes/enums/governance.enums";
import { MembershipEnrollmentStatus } from "../enums/membership-enrollment.enums";

/**
 * Mirrors outbound-request-workflow.ts's shape deliberately — same
 * underlying control (two independent approvals, one rejection vetoes
 * everything) — but not the same function, since eligibility here is a
 * platform role (tenant_admin/treasurer) rather than a scheme governance
 * role, a genuinely different type outbound-request-workflow.ts is
 * built around. Reusing that function's signature would have meant
 * forcing the wrong role concept through it; this is the same pattern,
 * adapted cleanly rather than force-fit.
 *
 * No self-approval check is needed here, unlike outbound requests — an
 * applicant has no TenantUser in this tenant yet (that's exactly what
 * approval creates), so they structurally cannot already hold an
 * approver-eligible role here to approve their own enrollment with.
 */
export const REQUIRED_ENROLLMENT_APPROVALS = 2;

/**
 * Every time limit in the enrollment flow, in one place. These are
 * deliberately plain data, passed to the pure functions below rather
 * than read from module constants inside them — so making them
 * per-cooperative settings later means changing where the policy comes
 * from, not rewriting any logic.
 */
export interface EnrollmentExpiryPolicy {
  /** How long an invite link lives — and how long an enrollment with no
   * approvals at all is allowed to wait. */
  inviteLinkLifetimeMs: number;
  /** How long an enrollment that already has one approval may wait for
   * the second, counted from when the person followed the link. */
  partialApprovalLifetimeMs: number;
}

export const DEFAULT_ENROLLMENT_EXPIRY_POLICY: EnrollmentExpiryPolicy = {
  inviteLinkLifetimeMs: 4 * 60 * 60 * 1000, // 4 hours
  partialApprovalLifetimeMs: 2 * 24 * 60 * 60 * 1000, // 2 days
};

export interface RecordEnrollmentApprovalInput {
  requestStatus: MembershipEnrollmentStatus;
  isEligibleApprover: boolean;
  existingApproverIds: string[];
  approverTenantUserId: string;
}

export function assertCanRecordEnrollmentApproval(input: RecordEnrollmentApprovalInput): void {
  if (input.requestStatus !== MembershipEnrollmentStatus.PENDING_APPROVAL) {
    throw new BadRequestException("This enrollment is no longer awaiting approval.");
  }

  if (input.existingApproverIds.includes(input.approverTenantUserId)) {
    throw new BadRequestException("You have already recorded a decision on this enrollment.");
  }

  if (!input.isEligibleApprover) {
    throw new BadRequestException(
      "You don't have permission to decide on new member requests.",
    );
  }
}

export function resolveEnrollmentStatus(input: {
  decisions: ApprovalDecision[];
  requiredApprovals: number;
}): MembershipEnrollmentStatus {
  if (input.decisions.includes(ApprovalDecision.REJECTED)) {
    return MembershipEnrollmentStatus.REJECTED;
  }

  const approvedCount = input.decisions.filter(
    (decision) => decision === ApprovalDecision.APPROVED,
  ).length;

  if (approvedCount >= input.requiredApprovals) {
    return MembershipEnrollmentStatus.APPROVED;
  }

  return MembershipEnrollmentStatus.PENDING_APPROVAL;
}

/**
 * - "none": still live.
 * - "no_approval_window_passed": the invite window closed and nobody
 *   approved — this is what the hourly job deletes outright.
 * - "second_approval_overdue": it has one approval but the second never
 *   came within the policy's allowance — the job marks it EXPIRED.
 *
 * A lapsed request still exists in the database until the job next runs,
 * so everything user-facing (the approvers' list, deciding, the
 * applicant's own sign-in) must treat anything other than "none" as
 * already gone, rather than waiting for cleanup.
 */
export type EnrollmentLapse =
  | "none"
  | "no_approval_window_passed"
  | "second_approval_overdue";

export function getEnrollmentLapse(input: {
  createdAt: Date;
  expiresAt: Date;
  decisions: ApprovalDecision[];
  now: Date;
  policy?: EnrollmentExpiryPolicy;
}): EnrollmentLapse {
  const policy = input.policy ?? DEFAULT_ENROLLMENT_EXPIRY_POLICY;
  const hasApproval = input.decisions.includes(ApprovalDecision.APPROVED);

  if (!hasApproval) {
    return input.expiresAt.getTime() < input.now.getTime() ? "no_approval_window_passed" : "none";
  }

  const overdueAt = input.createdAt.getTime() + policy.partialApprovalLifetimeMs;
  return overdueAt < input.now.getTime() ? "second_approval_overdue" : "none";
}
