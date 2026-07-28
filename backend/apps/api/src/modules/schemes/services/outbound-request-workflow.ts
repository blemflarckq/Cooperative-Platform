import { BadRequestException } from "@nestjs/common";
import {
  ApprovalDecision,
  OutboundRequestStatus,
  SchemeGovernanceRoleType,
} from "../enums/governance.enums";

export interface RecordApprovalInput {
  requestStatus: OutboundRequestStatus;
  initiatorTenantUserId: string;
  approverTenantUserId: string;
  /** Governance roles the approver currently, actively holds in this scheme. */
  approverCurrentRoleTypes: SchemeGovernanceRoleType[];
  /** From the scheme's ApprovalPolicy. */
  eligibleRoleTypes: SchemeGovernanceRoleType[];
  /** approverTenantUserIds who have already recorded a decision on this request. */
  existingApproverIds: string[];
}

/**
 * Validates whether a specific person is allowed to record an approval
 * decision on a request right now. Pure and DB-independent — the caller
 * is responsible for fetching the approver's current role assignments and
 * the scheme's policy beforehand.
 *
 * Enforces, in order:
 * - the request must still be awaiting approval (not already resolved)
 * - the initiator cannot approve their own request — otherwise "2
 *   approvers" quietly becomes "1 approver plus a rubber stamp," which
 *   defeats the entire point of the maker-checker control
 * - no approver can record a second decision on the same request
 * - the approver must currently hold a role this scheme's policy
 *   recognizes as eligible
 */
export function assertCanRecordApproval(input: RecordApprovalInput): void {
  if (input.requestStatus !== OutboundRequestStatus.INITIATED) {
    throw new BadRequestException(
      "This request is no longer awaiting approval.",
    );
  }

  if (input.approverTenantUserId === input.initiatorTenantUserId) {
    throw new BadRequestException(
      "The person who initiated a request cannot also approve it.",
    );
  }

  if (input.existingApproverIds.includes(input.approverTenantUserId)) {
    throw new BadRequestException(
      "You have already recorded a decision on this request.",
    );
  }

  const isEligible = input.approverCurrentRoleTypes.some((role) =>
    input.eligibleRoleTypes.includes(role),
  );

  if (!isEligible) {
    throw new BadRequestException(
      "You do not currently hold a role eligible to approve this request.",
    );
  }
}

/**
 * Resolves the overall status of a request given the full set of decisions
 * recorded so far (assumed to already be from eligible, de-duplicated
 * approvers — see assertCanRecordApproval).
 *
 * A single REJECTED decision ends the request immediately: a rejection
 * from any authorized approver is a real veto, not one vote among many.
 * Otherwise, the request becomes APPROVED the moment it has at least
 * `requiredApprovals` APPROVED decisions.
 */
export function resolveOutboundRequestStatus(input: {
  decisions: ApprovalDecision[];
  requiredApprovals: number;
}): OutboundRequestStatus {
  if (input.decisions.includes(ApprovalDecision.REJECTED)) {
    return OutboundRequestStatus.REJECTED;
  }

  const approvedCount = input.decisions.filter(
    (decision) => decision === ApprovalDecision.APPROVED,
  ).length;

  if (approvedCount >= input.requiredApprovals) {
    return OutboundRequestStatus.APPROVED;
  }

  return OutboundRequestStatus.INITIATED;
}
