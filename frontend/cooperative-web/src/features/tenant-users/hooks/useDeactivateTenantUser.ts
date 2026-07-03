import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deactivateTenantUser } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useDeactivateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateTenantUser,
    onSuccess: async (tenantUser) => {
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.lists(),
      });

      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.detail(tenantUser.id),
      });
    },
  });
}