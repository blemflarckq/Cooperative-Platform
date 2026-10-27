export interface InviteLinkResponse {
  token: string;
  expiresAt: string;
}

export interface InvitePreview {
  valid: boolean;
  tenantName?: string;
  reason?: "not_found" | "already_used" | "expired" | string;
}

export interface JoinResult {
  enrollmentId: string;
  status: string;
  tenantName: string;
}

export type EnrollmentDecision = "APPROVED" | "REJECTED";

export interface PendingEnrollment {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  applicant: {
    fullName: string;
    email: string | null;
    mobileMasked: string | null;
  };
  approvals: Array<{
    approverName: string;
    decision: EnrollmentDecision;
    decidedAt: string;
  }>;
  requiredApprovals: number;
  viewerHasDecided: boolean;
}
