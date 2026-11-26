import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { reactivateTenantUser } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useReactivateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivateTenantUser,
    onSuccess: async (tenantUser) => {
      await queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.detail(tenantUser.id),
      });
      toast.success("Member reactivated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
