import { apiClient } from "@/lib/api/api-client";
import type {
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateTempPasswordUserRequest,
  CreateTempPasswordUserResponse,
} from "@/features/tenant-users/types/tenant-user-enrollment.types";

export async function createTenantUserInvitation(
  payload: CreateInvitationRequest,
): Promise<CreateInvitationResponse> {
  const response = await apiClient.post<CreateInvitationResponse>(
    "/tenant-users/invitations",
    payload,
  );

  return response.data;
}

export async function revokeTenantUserInvitation(
  invitationId: string,
): Promise<{ success: boolean }> {
  const response = await apiClient.post<{ success: boolean }>(
    `/tenant-users/invitations/${invitationId}/revoke`,
  );

  return response.data;
}

export async function createTenantUserWithTempPassword(
  payload: CreateTempPasswordUserRequest,
): Promise<CreateTempPasswordUserResponse> {
  const response = await apiClient.post<CreateTempPasswordUserResponse>(
    "/tenant-users/temp-password",
    payload,
  );

  return response.data;
}

/**
 * Placeholder for future backend support.
 */
export async function resendTenantUserInvitation(
  invitationId: string,
): Promise<{ success: boolean }> {
  console.log("TODO: resend invitation", invitationId);
  return { success: true };
}