export const tenantUserQueryKeys = {
  all: ["tenant-users"] as const,
  lists: () => [...tenantUserQueryKeys.all, "list"] as const,
  list: () => [...tenantUserQueryKeys.lists()] as const,
  details: () => [...tenantUserQueryKeys.all, "detail"] as const,
  detail: (tenantUserId: string) =>
    [...tenantUserQueryKeys.details(), tenantUserId] as const,
};