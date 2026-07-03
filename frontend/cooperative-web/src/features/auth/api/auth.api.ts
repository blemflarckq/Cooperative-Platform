import { apiClient } from "@/lib/api/api-client";
import type {
    AcceptInvitationRequest,
    AcceptInvitationResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    AuthenticatedUserResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
} from "@/features/auth/types/auth.types";

export async function loginRequest(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

export async function acceptInvitation(
  payload: AcceptInvitationRequest,
): Promise<AcceptInvitationResponse> {
  const response = await apiClient.post<AcceptInvitationResponse>(
    "/auth/accept-invitation",
    payload,
  );

  console.log(response.data)
  return response.data;
  
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<ChangePasswordResponse> {
  const response = await apiClient.post<ChangePasswordResponse>(
    "/auth/change-password",
    payload,
  );

  return response.data;
}

export async function getMe(): Promise<AuthenticatedUserResponse> {
  const response = await apiClient.get<AuthenticatedUserResponse>("/auth/me");
  return response.data;
}

export async function refreshTokenRequest(
  payload: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<RefreshTokenResponse>(
    "/auth/refresh",
    payload,
  );

  return response.data;
}