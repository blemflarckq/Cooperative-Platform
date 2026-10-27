import { MembershipEnrollmentRequest } from "../entities/membership-enrollment-request.entity";
import { REQUIRED_ENROLLMENT_APPROVALS } from "../services/membership-enrollment-workflow";
import { maskMobile } from "../../../common/utils/mask-mobile";

/**
 * An explicit allow-list of what an approver is shown — deliberately
 * never a spread or pass-through of the entity. The previous version of
 * this endpoint returned the raw entities, which serialized the
 * applicant's and approvers' full User rows, password hashes included.
 */
export class MembershipEnrollmentResponseMapper {
  static toResponse(entity: MembershipEnrollmentRequest, viewerTenantUserId: string) {
    const approvals = entity.approvals ?? [];

    return {
      id: entity.id,
      status: entity.status,
      createdAt: entity.createdAt,
      expiresAt: entity.expiresAt,
      applicant: {
        fullName: `${entity.user?.firstName ?? ""} ${entity.user?.lastName ?? ""}`.trim() || "Unnamed person",
        email: entity.user?.email ?? null,
        mobileMasked: maskMobile(entity.user?.mobile),
      },
      approvals: approvals.map((approval) => ({
        approverName:
          `${approval.approver?.user?.firstName ?? ""} ${approval.approver?.user?.lastName ?? ""}`.trim() ||
          "An approver",
        decision: approval.decision,
        decidedAt: approval.decidedAt,
      })),
      requiredApprovals: REQUIRED_ENROLLMENT_APPROVALS,
      viewerHasDecided: approvals.some((a) => a.approverTenantUserId === viewerTenantUserId),
    };
  }
}
