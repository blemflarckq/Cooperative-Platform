import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenantUser } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useCreateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenantUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.lists(),
      });
    },
  });
}