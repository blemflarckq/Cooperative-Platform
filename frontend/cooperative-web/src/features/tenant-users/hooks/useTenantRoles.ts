import { useQuery } from "@tanstack/react-query";
import { getTenantRoles } from "@/features/tenant-users/api/tenant-users.api";
import { tenantRoleQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useTenantRoles() {
  return useQuery({
    queryKey: tenantRoleQueryKeys.all,
    queryFn: getTenantRoles,
    // Roles rarely change, but "which ones can I hand out" depends on who
    // is asking, so don't hold on to it for long.
    staleTime: 60 * 1000,
  });
}
