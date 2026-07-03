import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncTenantUserRoles } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

interface SyncTenantUserRolesInput {
  tenantUserId: string;
  roleIds: string[];
}

export function useSyncTenantUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantUserId, roleIds }: SyncTenantUserRolesInput) =>
      syncTenantUserRoles(tenantUserId, { roleIds }),

    onSuccess: async (tenantUser) => {
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.detail(tenantUser.id),
      });

      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.lists(),
      });
    },
  });
}