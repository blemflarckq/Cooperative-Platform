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
      "Only an admin or treasurer can decide on new member enrollment.",
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
