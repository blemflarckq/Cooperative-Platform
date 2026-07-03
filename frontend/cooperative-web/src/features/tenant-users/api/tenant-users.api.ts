import { apiClient } from "@/lib/api/api-client";
import type {
  CreateTenantUserRequest,
  SyncTenantUserRolesRequest,
  TenantUserDetails,
  TenantUserListItem,
  TenantUserResponse,
  UpdateTenantUserRequest,
} from "@/features/tenant-users/types/tenant-user.types";
import {
  mapTenantUserToDetails,
  mapTenantUserToListItem,
} from "@/features/tenant-users/api/tenant-user.mapper";

export async function getTenantUsers(): Promise<TenantUserListItem[]> {
  const response = await apiClient.get<TenantUserResponse[]>("/tenant-users");
  return response.data.map(mapTenantUserToListItem);
}

export async function getTenantUserById(
  tenantUserId: string,
): Promise<TenantUserDetails> {
  const response = await apiClient.get<TenantUserResponse>(
    `/tenant-users/${tenantUserId}`,
  );

  return mapTenantUserToDetails(response.data);
}

export async function createTenantUser(
  payload: CreateTenantUserRequest,
): Promise<TenantUserDetails> {
  const response = await apiClient.post<TenantUserResponse>(
    "/tenant-users",
    payload,
  );

  return mapTenantUserToDetails(response.data);
}

export async function updateTenantUser(
  tenantUserId: string,
  payload: UpdateTenantUserRequest,
): Promise<TenantUserDetails> {
  const response = await apiClient.patch<TenantUserResponse>(
    `/tenant-users/${tenantUserId}`,
    payload,
  );

  return mapTenantUserToDetails(response.data);
}

export async function deactivateTenantUser(
  tenantUserId: string,
): Promise<TenantUserDetails> {
  const response = await apiClient.patch<TenantUserResponse>(
    `/tenant-users/${tenantUserId}/deactivate`,
  );

  return mapTenantUserToDetails(response.data);
}

export async function syncTenantUserRoles(
  tenantUserId: string,
  payload: SyncTenantUserRolesRequest,
): Promise<TenantUserDetails> {
  const response = await apiClient.put<TenantUserResponse>(
    `/tenant-users/${tenantUserId}/roles`,
    payload,
  );

  return mapTenantUserToDetails(response.data);
}