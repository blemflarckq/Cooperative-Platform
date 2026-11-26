import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { updateTenantUser } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";
import type { UpdateTenantUserRequest } from "@/features/tenant-users/types/tenant-user.types";

interface UpdateTenantUserInput {
  tenantUserId: string;
  values: UpdateTenantUserRequest;
}

export function useUpdateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantUserId, values }: UpdateTenantUserInput) =>
      updateTenantUser(tenantUserId, values),

    onSuccess: async (tenantUser) => {
      await queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.detail(tenantUser.id),
      });
      toast.success("Name updated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
