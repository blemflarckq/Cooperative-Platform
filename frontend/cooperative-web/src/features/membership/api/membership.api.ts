import { apiClient } from "@/lib/api/api-client";
import type {
  EnrollmentDecision,
  InviteLinkResponse,
  InvitePreview,
  JoinResult,
  PendingEnrollment,
} from "../types/membership.types";

export async function generateInviteLinkRequest(): Promise<InviteLinkResponse> {
  const response = await apiClient.post<InviteLinkResponse>("/membership/invite-links");
  return response.data;
}

export async function getInvitePreviewRequest(token: string): Promise<InvitePreview> {
  const response = await apiClient.get<InvitePreview>(`/membership/invite-links/${token}`);
  return response.data;
}

/** For someone who already has a session. */
export async function acceptInviteRequest(token: string): Promise<JoinResult> {
  const response = await apiClient.post<JoinResult>(`/membership/invite-links/${token}/accept`);
  return response.data;
}

/**
 * For someone who has just signed in or registered and belongs to no
 * cooperative yet — they hold only a pre-auth token, never an access
 * token, so the authenticated route above can't serve them.
 */
export async function joinWithPreAuthToken(
  token: string,
  preAuthToken: string,
): Promise<JoinResult> {
  const response = await apiClient.post<JoinResult>(`/membership/invite-links/${token}/join`, {
    preAuthToken,
  });
  return response.data;
}

export async function getPendingEnrollmentsRequest(): Promise<PendingEnrollment[]> {
  const response = await apiClient.get<PendingEnrollment[]>("/membership/enrollments/pending");
  return response.data;
}

export async function recordEnrollmentDecisionRequest(input: {
  enrollmentId: string;
  decision: EnrollmentDecision;
}): Promise<{ id: string; status: string }> {
  const response = await apiClient.post<{ id: string; status: string }>(
    `/membership/enrollments/${input.enrollmentId}/decision`,
    { decision: input.decision },
  );
  return response.data;
}
