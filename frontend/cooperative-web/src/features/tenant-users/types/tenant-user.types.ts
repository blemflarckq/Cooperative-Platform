export type TenantUserStatus = "active" | "inactive" | "suspended" | "invited";

export interface TenantRoleSummary {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface TenantUserResponse {
  id: string;
  tenantId: string;
  userId: string;
  isActive: boolean;
  status: TenantUserStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
  roles: TenantRoleSummary[];
}

export interface TenantUserListItem {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  email: string;
  firstName: string;
  lastName: string;
  userIsActive: boolean;
  membershipIsActive: boolean;
  status: TenantUserStatus;
  createdAt: string;
  updatedAt: string;
  roles: TenantRoleSummary[];
}

//export interface TenantUserDetails extends TenantUserListItem {}

export type TenantUserDetails = TenantUserListItem

export interface CreateTenantUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  roleIds?: string[];
}

export interface UpdateTenantUserRequest {
  firstName: string;
  lastName: string;
  email: string;
}

export interface SyncTenantUserRolesRequest {
  roleIds: string[];
}