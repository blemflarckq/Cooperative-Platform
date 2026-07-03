export type EnrollmentMethod = "invitation" | "temporary-password";

export interface CreateInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  roleIds: string[];
}

export interface CreateInvitationResponse {
  tenantUserId: string;
  invitationId: string;
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  activationUrl?: string;
}

export interface CreateTempPasswordUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  temporaryPassword: string;
  roleIds: string[];
}

export interface CreateTempPasswordUserResponse {
  tenantUserId: string;
  userId: string;
  email: string;
  mustChangePassword: boolean;
}