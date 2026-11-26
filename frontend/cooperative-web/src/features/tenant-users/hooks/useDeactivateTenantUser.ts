import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { deactivateTenantUser } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

/**
 * Follow-through lives here, not in the page: the confirmation dialog
 * that triggers this closes as soon as it is confirmed, so a per-call
 * callback could run against a screen that has already moved on.
 */
export function useDeactivateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateTenantUser,
    onSuccess: async (_result, tenantUserId) => {
      await queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.detail(tenantUserId),
      });
      toast.success("Member deactivated");
    },
    // The server's own words — they already say why ("You can't deactivate
    // yourself", "The cooperative must always have at least one…").
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
