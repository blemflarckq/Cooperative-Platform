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
    mobileMasked: string | null;
    isActive: boolean;
  } | null;
  roles: TenantRoleSummary[];
  schemeNames: string[];
  /**
   * Only present on the single-member response. True when this person is
   * also an active member of another cooperative — their name belongs to
   * their account, so only they may change it.
   */
  identityShared?: boolean;
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
  mobileMasked: string | null;
  schemeNames: string[];
  identityShared?: boolean;
}

//export interface TenantUserDetails extends TenantUserListItem {}

export type TenantUserDetails = TenantUserListItem

export interface CreateTenantUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  roleIds?: string[];
}

/** Names only — everything else about a member has its own, safeguarded route. */
export interface UpdateTenantUserRequest {
  firstName: string;
  lastName: string;
}

/**
 * A role the cooperative has, as seen by the person about to give it out.
 * `canAssign` is decided by the server (who may hand out which role);
 * when false, `lockedReason` is the plain-language reason to show in place.
 */
export interface TenantRoleOption {
  id: string;
  name: string;
  code: string;
  description: string | null;
  canAssign: boolean;
  lockedReason: string | null;
}

export interface SyncTenantUserRolesRequest {
  roleIds: string[];
}