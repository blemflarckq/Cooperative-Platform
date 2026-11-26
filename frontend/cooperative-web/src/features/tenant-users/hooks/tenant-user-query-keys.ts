export const tenantUserQueryKeys = {
  all: ["tenant-users"] as const,
  lists: () => [...tenantUserQueryKeys.all, "list"] as const,
  list: () => [...tenantUserQueryKeys.lists()] as const,
  details: () => [...tenantUserQueryKeys.all, "detail"] as const,
  detail: (tenantUserId: string) =>
    [...tenantUserQueryKeys.details(), tenantUserId] as const,
};

/**
 * The cooperative's roles. Their own key, deliberately outside
 * "tenant-users": changing a member's roles must not make the roles list
 * itself refetch.
 */
export const tenantRoleQueryKeys = {
  all: ["tenant-roles"] as const,
};
