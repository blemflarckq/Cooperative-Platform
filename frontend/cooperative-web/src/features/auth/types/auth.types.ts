export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  tenantName?: string;
   roles?: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserResponse;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export type AuthResult =
  | ({ status: "authenticated" } & LoginResponse)
  | { status: "select_tenant"; preAuthToken: string; tenants: TenantOption[] }
  | { status: "no_tenant"; preAuthToken: string };

export interface SelectTenantRequest {
  preAuthToken: string;
  tenantId: string;
}

export interface CreateTenantRequest {
  preAuthToken: string;
  name: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  tenantId: string;
  tenantSlug: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
