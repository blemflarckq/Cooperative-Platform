import type { AuthUser } from "@/lib/auth/auth-storage";
import type { AuthenticatedUserResponse } from "@/features/auth/types/auth.types";

export function mapAuthenticatedUser(response: AuthenticatedUserResponse): AuthUser {
  console.log(`This is the current-user ${response.id}`)
  return {
    id: response.id,
    email: response.email,
    fullName:
      `${response.firstName ?? ""} ${response.lastName ?? ""}`.trim(),
    tenantId: response.tenantId,
    tenantName: response.tenantName,
     roles: response.roles ?? [],
    permissions: response.permissions ?? [],
    mustChangePassword: response.mustChangePassword ?? false,
  };
}