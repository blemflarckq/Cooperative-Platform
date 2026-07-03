import type {
  TenantUserDetails,
  TenantUserListItem,
  TenantUserResponse,
} from "@/features/tenant-users/types/tenant-user.types";

export function mapTenantUserToListItem(
  response: TenantUserResponse,
): TenantUserListItem {
  const firstName = response.user?.firstName ?? "";
  const lastName = response.user?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unnamed user";

  return {
    id: response.id,
    tenantId: response.tenantId,
    userId: response.userId,
    fullName,
    firstName,
    lastName,
    email: response.user?.email ?? "No email",
    userIsActive: response.user?.isActive ?? false,
    membershipIsActive: response.isActive,
    status: response.status,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    roles: response.roles ?? [],
  };
}

export function mapTenantUserToDetails(
  response: TenantUserResponse,
): TenantUserDetails {
  return mapTenantUserToListItem(response);
}